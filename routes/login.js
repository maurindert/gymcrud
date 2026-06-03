const express  = require('express');
const oracledb = require('oracledb');
const config   = require('../js/db');
const router   = express.Router();

router.post('/login', async (req, res) => {
    const { usuario, clave } = req.body;

    if (!usuario || !clave) {
        return res.status(400).json({ success: false, message: 'Usuario y clave son obligatorios' });
    }

    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resultado = await conexion.execute(
            `SELECT nombre FROM usuarios WHERE username = :usuario AND passw = :clave`,
            { usuario, clave },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const encontrado = resultado.rows[0];
        if (encontrado) {
            res.json({ success: true, usuario: encontrado.NOMBRE });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }

    } catch (err) {
        console.error('[LOGIN] Error:', err.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        if (conexion) await conexion.close();
    }
});

module.exports = router;