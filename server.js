require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

// ---------------------------
// Middlewares generales
// ---------------------------
app.use(cors());
app.use(express.json());

// ---------------------------
// Rate limit SOLO para /enviar
// ---------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 requests por IP
  message: {
    ok: false,
    message: "Demasiadas solicitudes. Intentá nuevamente más tarde."
  }
});

// ---------------------------
// Función simple para sanitizar
// ---------------------------
const sanitize = (text) => {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

// ---------------------------
// Endpoint contacto
// ---------------------------
app.post("/enviar", limiter, async (req, res) => {
  const { nombre, email, mensaje, website } = req.body;

  // Honeypot anti-spam
  if (website) {
    return res.status(400).send({ ok: false });
  }

  // Validaciones 
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

  // Sanitizar inputs
  const safeNombre = sanitize(nombre);
  const safeEmail = sanitize(email);
  const safeMensaje = sanitize(mensaje);

  console.log("Mensaje recibido:");
  console.log("Nombre:", safeNombre);
  console.log("Email:", safeEmail);
  console.log("------------------------");

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      replyTo: safeEmail,
      to: process.env.EMAIL_USER,
      subject: "Mensaje desde la web",
      html: `
        <div style="font-family: Arial; max-width:600px; margin:auto; border:1px solid #ddd; border-radius:8px; padding:20px;">
          <h2 style="color:#8b5e3c;">Nuevo mensaje desde la web</h2>

          <p><strong>Nombre:</strong> ${safeNombre}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>

          <hr>

          <p><strong>Mensaje:</strong></p>
          <p style="white-space:pre-line;">${safeMensaje}</p>

          <hr>

          <p style="font-size:12px; color:#777;">
            Mensaje enviado desde el formulario web.
          </p>
        </div>
      `
    });

    console.log("Correo enviado correctamente");
    console.log("========================");

    res.send({ ok: true });

  } catch (error) {
    console.log("Error enviando correo:");
    console.log(error);
    res.status(500).send({ ok: false });
  }
});

// ---------------------------
// Puerto dinámico para deploy
// ---------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});