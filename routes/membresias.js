const express  = require('express');
const oracledb = require('oracledb');
const config   = require('../js/db');
const router   = express.Router();

// GET /api/membresias — listar todas
router.get('/membresias', async (req, res) => {
    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resultado = await conexion.execute(
            `SELECT membresia_id, descripcion, duracion, precio
             FROM membresias
             ORDER BY membresia_id`,
            {},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(resultado.rows);

    } catch (err) {
        console.error('[MEMBRESIAS GET]', err.message);
        res.status(500).json({ success: false, message: 'Error al obtener membresías' });
    } finally {
        if (conexion) await conexion.close();
    }
});

// POST /api/membresias — crear nueva
router.post('/membresias', async (req, res) => {
    const { descripcion, duracion, precio } = req.body;

    if (!descripcion || !duracion || !precio) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        await conexion.execute(
            `INSERT INTO membresias (descripcion, duracion, precio)
             VALUES (:descripcion, :duracion, :precio)`,
            { descripcion, duracion, precio },
            { autoCommit: true }
        );

        res.json({ success: true, message: 'Membresía creada correctamente' });

    } catch (err) {
        console.error('[MEMBRESIAS POST]', err.message);
        res.status(500).json({ success: false, message: 'Error al crear membresía' });
    } finally {
        if (conexion) await conexion.close();
    }
});

// PUT /api/membresias/:id — actualizar
router.put('/membresias/:id', async (req, res) => {
    const { id } = req.params;
    const { descripcion, duracion, precio } = req.body;

    if (!descripcion || !duracion || !precio) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resultado = await conexion.execute(
            `UPDATE membresias
             SET descripcion = :descripcion, duracion = :duracion, precio = :precio
             WHERE membresia_id = :id`,
            { descripcion, duracion, precio, id },
            { autoCommit: true }
        );

        if (resultado.rowsAffected === 0) {
            return res.status(404).json({ success: false, message: 'Membresía no encontrada' });
        }

        res.json({ success: true, message: 'Membresía actualizada correctamente' });

    } catch (err) {
        console.error('[MEMBRESIAS PUT]', err.message);
        res.status(500).json({ success: false, message: 'Error al actualizar membresía' });
    } finally {
        if (conexion) await conexion.close();
    }
});

// DELETE /api/membresias/:id — eliminar
router.delete('/membresias/:id', async (req, res) => {
    const { id } = req.params;

    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resultado = await conexion.execute(
            `DELETE FROM membresias WHERE membresia_id = :id`,
            { id },
            { autoCommit: true }
        );

        if (resultado.rowsAffected === 0) {
            return res.status(404).json({ success: false, message: 'Membresía no encontrada' });
        }

        res.json({ success: true, message: 'Membresía eliminada correctamente' });

    } catch (err) {
        console.error('[MEMBRESIAS DELETE]', err.message);
        res.status(500).json({ success: false, message: 'Error al eliminar membresía' });
    } finally {
        if (conexion) await conexion.close();
    }
});

module.exports = router;