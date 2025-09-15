
# 📈 Stock Price Checker

Proyecto de **FreeCodeCamp Information Security & Quality Assurance**  
Implementado con **Node.js, Express, MongoDB, Helmet y Axios**.  

✅ Todas las pruebas de FreeCodeCamp superadas.  
🔒 Seguridad con Content Security Policy (CSP).  
📊 Comparación de precios y likes entre acciones.

---

## 🚀 Características

- Consulta precios de acciones en tiempo real usando el **proxy de FreeCodeCamp**.
- Sistema de **likes único por IP** para cada acción.
- Comparación entre **dos acciones**, mostrando diferencia de likes (`rel_likes`).
- Configuración de seguridad con **Helmet** para cumplir con políticas CSP.
- Persistencia en **MongoDB Atlas** con Mongoose.

---

## 📂 Estructura del proyecto

.
├── routes/
│ ├── api.js # Lógica principal de la API
│ └── fcctesting.js # Rutas de prueba FCC
├── tests/
│ └── 2_functional-tests.js # Pruebas funcionales
├── views/
│ └── index.html # Vista inicial
├── server.js # Configuración Express + MongoDB
├── package.json
├── .env

yaml
Copiar código

---

## 🛠️ Tecnologías usadas

- **Node.js** + **Express** → Servidor y rutas API.
- **MongoDB Atlas** + **Mongoose** → Base de datos para likes únicos por acción.
- **Axios** → Peticiones al proxy FCC para obtener precios.
- **Helmet** → Seguridad CSP (solo carga scripts y estilos desde el servidor).
- **Mocha + Chai** → Testing.
- **Render** → Deploy y hosting.

---

## ⚙️ Variables de entorno

En tu archivo `.env` debes configurar:

PORT=3000
DB=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/stockchecker
NODE_ENV=production

yaml
Copiar código

---

## 📌 Endpoints principales

### `GET /api/stock-prices?stock=GOOG`
```json
{
  "stockData": {
    "stock": "GOOG",
    "price": 241.38,
    "likes": 1
  }
}
GET /api/stock-prices?stock=GOOG&like=true
Registra un like desde tu IP.

GET /api/stock-prices?stock=GOOG&stock=MSFT
json
Copiar código
{
  "stockData": [
    {
      "stock": "GOOG",
      "price": 241.38,
      "rel_likes": 1
    },
    {
      "stock": "MSFT",
      "price": 509.9,
      "rel_likes": -1
    }
  ]
}
✅ Pruebas FCC
 CSP configurado correctamente.

 Retorna datos de una acción.

 Maneja likes únicos por IP.

 Comparación de 2 acciones con rel_likes.

 Pruebas funcionales con Mocha/Chai.

🌍 Demo en Render
🔗 Live App: https://boilerplate-project-stockchecker-ahib.onrender.com