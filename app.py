from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Isso permite que o frontend se comunique com o backend

# Configuração do banco de dados
DATABASE = 'ideas.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        
        # Criar tabela se não existir
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ideas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                completed BOOLEAN NOT NULL DEFAULT 0
            )
        ''')
        
        db.commit()

# Rotas da API
@app.route('/api/ideas', methods=['GET'])
def get_ideas():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM ideas ORDER BY date DESC')
        ideas = cursor.fetchall()
        
        # Converter para dicionário
        ideas_list = []
        for idea in ideas:
            ideas_list.append({
                'id': idea['id'],
                'title': idea['title'],
                'content': idea['content'],
                'category': idea['category'],
                'date': idea['date'],
                'completed': bool(idea['completed'])
            })
        
        return jsonify(ideas_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ideas', methods=['POST'])
def add_idea():
    try:
        data = request.get_json()
        
        if not data or 'title' not in data or 'content' not in data:
            return jsonify({'error': 'Dados incompletos'}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            INSERT INTO ideas (title, content, category, date, completed)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['title'],
            data['content'],
            data.get('category', 'ideia'),
            data.get('date', datetime.now().isoformat()),
            data.get('completed', False)
        ))
        
        db.commit()
        
        return jsonify({'message': 'Ideia adicionada com sucesso', 'id': cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ideas/<int:idea_id>', methods=['PUT'])
def update_idea(idea_id):
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dados incompletos'}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            UPDATE ideas 
            SET title = ?, content = ?, category = ?
            WHERE id = ?
        ''', (
            data['title'],
            data['content'],
            data.get('category', 'ideia'),
            idea_id
        ))
        
        db.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Ideia não encontrada'}), 404
        
        return jsonify({'message': 'Ideia atualizada com sucesso'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ideas/<int:idea_id>', methods=['PATCH'])
def patch_idea(idea_id):
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dados incompletos'}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        # Construir a query dinamicamente baseada nos campos fornecidos
        fields = []
        values = []
        
        if 'completed' in data:
            fields.append('completed = ?')
            values.append(data['completed'])
        
        if 'title' in data:
            fields.append('title = ?')
            values.append(data['title'])
            
        if 'content' in data:
            fields.append('content = ?')
            values.append(data['content'])
            
        if 'category' in data:
            fields.append('category = ?')
            values.append(data['category'])
        
        if not fields:
            return jsonify({'error': 'Nenhum campo para atualizar'}), 400
        
        values.append(idea_id)
        
        query = f'UPDATE ideas SET {", ".join(fields)} WHERE id = ?'
        cursor.execute(query, values)
        
        db.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Ideia não encontrada'}), 404
        
        return jsonify({'message': 'Ideia atualizada com sucesso'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ideas/<int:idea_id>', methods=['DELETE'])
def delete_idea(idea_id):
    try:
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('DELETE FROM ideas WHERE id = ?', (idea_id,))
        db.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Ideia não encontrada'}), 404
        
        return jsonify({'message': 'Ideia excluída com sucesso'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Total de ideias
        cursor.execute('SELECT COUNT(*) as total FROM ideas')
        total = cursor.fetchone()['total']
        
        # Ideias concluídas
        cursor.execute('SELECT COUNT(*) as completed FROM ideas WHERE completed = 1')
        completed = cursor.fetchone()['completed']
        
        # Ideias de hoje
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute('SELECT COUNT(*) as today FROM ideas WHERE date LIKE ?', (f'{today}%',))
        today_count = cursor.fetchone()['today']
        
        # Taxa de conclusão
        completion_rate = round((completed / total * 100) if total > 0 else 0, 2)
        
        return jsonify({
            'total': total,
            'completed': completed,
            'today': today_count,
            'completion_rate': completion_rate
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)