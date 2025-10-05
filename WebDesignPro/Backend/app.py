from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

# ========================================
# FLASK APP + DATABASE CONFIG
# ========================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))       # backend/
FRONTEND_DIR = os.path.join(BASE_DIR, "../frontend")        # frontend/

app = Flask(
    __name__,
    template_folder=FRONTEND_DIR,       # where index.html is
    static_folder=FRONTEND_DIR          # where styles.css, script.js are
)

# MySQL Database URI (update password if needed)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:aaaa@127.0.0.1/inventory_manage'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'

db = SQLAlchemy(app)

# ========================================
# DATABASE MODELS
# ========================================

class Product(db.Model):
    __tablename__ = 'products'
    product_id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    movements = db.relationship(
        'ProductMovement',
        backref='product',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            'product_id': self.product_id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Location(db.Model):
    __tablename__ = 'locations'
    location_id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    movements_from = db.relationship(
        'ProductMovement',
        foreign_keys='ProductMovement.from_location',
        backref='from_loc',
        lazy='dynamic'
    )
    movements_to = db.relationship(
        'ProductMovement',
        foreign_keys='ProductMovement.to_location',
        backref='to_loc',
        lazy='dynamic'
    )

    def to_dict(self):
        return {
            'location_id': self.location_id,
            'name': self.name,
            'address': self.address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ProductMovement(db.Model):
    __tablename__ = 'product_movements'
    movement_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    from_location = db.Column(db.String(50), db.ForeignKey('locations.location_id'))
    to_location = db.Column(db.String(50), db.ForeignKey('locations.location_id'))
    product_id = db.Column(db.String(50), db.ForeignKey('products.product_id'), nullable=False)
    qty = db.Column(db.Integer, nullable=False)

    __table_args__ = (
        db.CheckConstraint('qty > 0', name='check_positive_qty'),
    )

    def to_dict(self):
        return {
            'movement_id': self.movement_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'from_location': self.from_location,
            'to_location': self.to_location,
            'product_id': self.product_id,
            'qty': self.qty,
            'movement_type': self.get_movement_type()
        }

    def get_movement_type(self):
        if self.to_location and not self.from_location:
            return 'Stock In'
        elif self.from_location and not self.to_location:
            return 'Stock Out'
        else:
            return 'Transfer'


# ========================================
# ROUTES (PRODUCTS / LOCATIONS / MOVEMENTS / REPORTS)
# ========================================

@app.route('/')
def index():
    return render_template('index.html')


# ---- Product APIs ----
@app.route('/api/products', methods=['GET'])
def get_products():
    search = request.args.get('search', '')
    if search:
        products = Product.query.filter(
            db.or_(
                Product.name.ilike(f'%{search}%'),
                Product.product_id.ilike(f'%{search}%'),
                Product.description.ilike(f'%{search}%')
            )
        ).all()
    else:
        products = Product.query.all()
    return jsonify([p.to_dict() for p in products])


@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json()
    if not data or not data.get('product_id') or not data.get('name'):
        return jsonify({'error': 'Product ID and name are required'}), 400
    if Product.query.get(data['product_id']):
        return jsonify({'error': 'Product already exists'}), 400

    product = Product(
        product_id=data['product_id'],
        name=data['name'],
        description=data.get('description', '')
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Product deleted'})


# ---- Location APIs ----
@app.route('/api/locations', methods=['GET'])
def get_locations():
    locations = Location.query.all()
    return jsonify([l.to_dict() for l in locations])


@app.route('/api/locations', methods=['POST'])
def create_location():
    data = request.get_json()
    if not data or not data.get('location_id') or not data.get('name'):
        return jsonify({'error': 'Location ID and name are required'}), 400
    if Location.query.get(data['location_id']):
        return jsonify({'error': 'Location already exists'}), 400

    location = Location(
        location_id=data['location_id'],
        name=data['name'],
        address=data.get('address', '')
    )
    db.session.add(location)
    db.session.commit()
    return jsonify(location.to_dict()), 201


@app.route('/api/locations/<location_id>', methods=['DELETE'])
def delete_location(location_id):
    location = Location.query.get_or_404(location_id)
    db.session.delete(location)
    db.session.commit()
    return jsonify({'message': 'Location deleted'})


# ---- Movement APIs ----
@app.route('/api/movements', methods=['GET'])
def get_movements():
    movements = ProductMovement.query.order_by(ProductMovement.timestamp.desc()).all()
    return jsonify([m.to_dict() for m in movements])


@app.route('/api/movements', methods=['POST'])
def create_movement():
    data = request.get_json()
    if not data or not data.get('product_id') or not data.get('qty'):
        return jsonify({'error': 'Product ID and quantity required'}), 400

    qty = int(data['qty'])
    movement = ProductMovement(
        product_id=data['product_id'],
        from_location=data.get('from_location'),
        to_location=data.get('to_location'),
        qty=qty
    )
    db.session.add(movement)
    db.session.commit()
    return jsonify(movement.to_dict()), 201


@app.route('/api/movements/<int:movement_id>', methods=['DELETE'])
def delete_movement(movement_id):
    movement = ProductMovement.query.get_or_404(movement_id)
    db.session.delete(movement)
    db.session.commit()
    return jsonify({'message': 'Movement deleted'})


# ========================================
# SAMPLE DATA + DB INIT
# ========================================

def create_sample_data():
    if Product.query.count() == 0:
        products = [
            Product(product_id='PROD001', name='Laptop', description='High-performance laptop'),
            Product(product_id='PROD002', name='Mouse', description='Wireless mouse')
        ]
        db.session.add_all(products)

    if Location.query.count() == 0:
        locations = [
            Location(location_id='WH001', name='Main Warehouse', address='123 Storage Street'),
            Location(location_id='STORE01', name='Retail Store', address='456 Market Road')
        ]
        db.session.add_all(locations)

    if ProductMovement.query.count() == 0:
        moves = [
            ProductMovement(product_id='PROD001', to_location='WH001', qty=20),
            ProductMovement(product_id='PROD002', to_location='STORE01', qty=15)
        ]
        db.session.add_all(moves)

    db.session.commit()


# ========================================
# APP START
# ========================================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        create_sample_data()
    app.run(debug=True)
