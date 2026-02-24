require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { Resend } = require("resend");

const app = express();
app.set("trust proxy", 1);
const resend = new Resend(process.env.RESEND_API_KEY);

// ---------------------------
// Middlewares generales
// ---------------------------
app.use(cors());
app.use(express.json());

// ---------------------------
// Endpoint raíz
// ---------------------------
app.get("/", (req, res) => {
  res.send("Backend funcionando correctamente 🚀");
});

// ---------------------------
// Rate limit SOLO para /enviar
// ---------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    ok: false,
    message: "Demasiadas solicitudes. Intentá nuevamente más tarde."
  }
});

// ---------------------------
// Sanitizar
// ---------------------------
const sanitize = (text) =>
  text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------
// Endpoint contacto
// ---------------------------
app.post("/enviar", limiter, async (req, res) => {
  const { nombre, email, mensaje, website } = req.body;

  if (website) return res.status(400).send({ ok: false });

  if (
    !nombre ||
    !email ||
    !mensaje ||
    nombre.length < 2 ||
    mensaje.length < 10 ||
    mensaje.length > 500 ||
    !email.includes("@")
  ) {
    return res.status(400).send({ ok: false });
  }

  const safeNombre = sanitize(nombre);
  const safeEmail = sanitize(email);
  const safeMensaje = sanitize(mensaje);

  try {
    await resend.emails.send({
      from: "Web Contacto <onboarding@resend.dev>",
      to: process.env.EMAIL_USER, // tu mail donde querés recibir
      reply_to: safeEmail,
      subject: "Mensaje desde la web",
      html: `
        <h2>Nuevo mensaje desde la web</h2>
        <p><strong>Nombre:</strong> ${safeNombre}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <hr>
        <p>${safeMensaje}</p>
      `
    });

    res.send({ ok: true });

  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false });
  }
});

// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});