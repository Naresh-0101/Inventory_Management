# 📦 InventoryPro - Inventory Management System

## 1. Project Overview
InventoryPro is a lightweight, web-based **Inventory Management System** built using **Flask (Python)** for the backend and **HTML/CSS/JavaScript** for the frontend.  
It enables small and medium-sized businesses to manage products, track stock movements, and monitor multiple locations in real time.

### 🎯 Objectives
- Simplify product and stock management  
- Provide visibility into inbound, outbound, and transfer activities  
- Support decision-making with reports and data insights  
- Ensure modular, scalable, and secure architecture  

---

## 2. System Architecture
The application follows a **two-tier architecture**:

### 🖥️ Frontend (Client-Side)
- Built with HTML, CSS, JavaScript  
- Hosted in the `frontend/` directory  
- Communicates with backend via RESTful APIs (`/api/...` routes)  
- User-friendly interface for managing products, locations, and stock  

### ⚙️ Backend (Server-Side)
- Developed in Flask (`app.py` inside `backend/`)  
- Handles database operations, API routing, and business logic  
- Uses **Flask-SQLAlchemy ORM** for database interaction  
- Ensures validation, security, and consistency  

### 🗄️ Database Layer
- **MySQL Database** (`inventory_manage`)  
- Three main entities:  
  - `products`  
  - `locations`  
  - `product_movements`  
- Uses foreign keys for relational integrity  
- Enforces constraints (e.g., positive quantity check)  

---

## 3. Features
### ✅ Product Management
- Add, search, and delete products  
- Each product has ID, name, description, and creation date  

### ✅ Location Management
- Add, view, and remove storage/retail locations  
- Each location has ID, name, address, and timestamp  

### ✅ Stock Movement
- Track stock movement (**Stock In, Stock Out, Transfer**)  
- Record product, quantity, source, and destination  
- Enforces positive quantity validation  

### ✅ Reports
- Stock activity timeline with movement types  
- Product-based and location-based stock summaries  

### ✅ API Endpoints
- `/api/products` – Manage products  
- `/api/locations` – Manage locations  
- `/api/movements` – Manage stock movements  

---

## 4. Database Design

### 📌 Products (`products`)
| Column      | Type         | Constraints          |
|-------------|-------------|----------------------|
| product_id  | VARCHAR(50) | Primary Key          |
| name        | VARCHAR(100)| Not Null             |
| description | TEXT        | Optional             |
| created_at  | DATETIME    | Default UTC time     |

### 📌 Locations (`locations`)
| Column      | Type         | Constraints          |
|-------------|-------------|----------------------|
| location_id | VARCHAR(50) | Primary Key          |
| name        | VARCHAR(100)| Not Null             |
| address     | TEXT        | Optional             |
| created_at  | DATETIME    | Default UTC time     |

### 📌 Product Movements (`product_movements`)
| Column       | Type         | Constraints                        |
|--------------|-------------|------------------------------------|
| movement_id  | INT         | Primary Key, Auto Increment        |
| timestamp    | DATETIME    | Default UTC time                   |
| from_location| VARCHAR(50) | FK → locations                     |
| to_location  | VARCHAR(50) | FK → locations                     |
| product_id   | VARCHAR(50) | FK → products                      |
| qty          | INT         | Must be > 0                        |

---

## 5. Workflow
1. **Product Creation** → Admin adds product → stored in `products` table  
2. **Location Setup** → Define warehouses/stores → stored in `locations`  
3. **Stock Movement** → User records stock flow → stored in `product_movements`  
4. **Reports** → Fetch movement history via `/api/movements` and display summaries  

---

## 6. Tech Stack
- **Backend:** Flask (Python), SQLAlchemy  
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla JS)  
- **Database:** MySQL  
- **APIs:** RESTful API design  
- **Hosting (Optional):** Gunicorn + Nginx / Docker  

---

## 7. Sample API Usage

### GET `/api/products`
Returns list of products  

### POST `/api/locations`
Adds a new location  

### POST `/api/movements`
Records stock movement  

**Example Request (JSON):**
```json
{
  "product_id": "PROD001",
  "from_location": "WH001",
  "to_location": "STORE01",
  "qty": 10
}
