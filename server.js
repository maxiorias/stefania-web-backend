require("dotenv").config({ path: ".env" });

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { Resend } = require("resend");

const app = express();

// ⭐ Render proxy config
app.set("trust proxy", 1);

// ⭐ Verificar API Key antes de iniciar
if (!process.env.RESEND_API_KEY) {
  console.error("❌ Falta RESEND_API_KEY en variables de entorno");
}

const resend = new Resend(process.env.RESEND_API_KEY);

// ---------------------------
// Middlewares
// ---------------------------

app.use(
  cors({
    origin: ["https://stefania-web-frontend.vercel.app"], // ❗ SIN la barra final
    methods: ["GET", "POST"],
    credentials: true
  })
);

app.use(express.json());

// ---------------------------
// Endpoint raíz
// ---------------------------

app.get("/", (req, res) => {
  res.send("Backend funcionando correctamente 🚀");
});

// ---------------------------
// Rate limit
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
// Sanitizar input
// ---------------------------

const sanitize = (text = "") =>
  text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------
// Endpoint contacto
// ---------------------------

app.post("/enviar", limiter, async (req, res) => {
  try {
    const { nombre, email, mensaje, website } = req.body;

    if (website) {
      return res.status(400).send({ ok: false });
    }

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

    if (!process.env.EMAIL_USER) {
      throw new Error("EMAIL_USER no configurado");
    }

    await resend.emails.send({
      from: "Web Contacto <onboarding@resend.dev>",
      to: process.env.EMAIL_USER,
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
    console.log("Error envío:", error);
    res.status(500).send({
      ok: false,
      message: "Error al enviar el mensaje"
    });
  }
});

// ---------------------------

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});