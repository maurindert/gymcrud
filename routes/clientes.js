const express  = require('express');
const oracledb = require('oracledb');
const config   = require('../js/db');
const router   = express.Router();

// GET /api/clientes — listar todos
router.get('/clientes', async (req, res) => {
    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resultado = await conexion.execute(
            `SELECT cliente_id,
                    ci,
                    nombre,
                    apellido,
                    telefono,
                    activo,
                    sexo,
                    tipo_ejercicio,
                    TRUNC(MONTHS_BETWEEN(SYSDATE, fecha_nacimiento) / 12) AS edad
             FROM   clientes
             ORDER  BY cliente_id`,
            {},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(resultado.rows);

    } catch (err) {
        console.error('[CLIENTES GET]', err.message);
        res.status(500).json({ success: false, message: 'Error al obtener clientes' });
    } finally {
        if (conexion) await conexion.close();
    }
});

// GET /api/clientes/reporte — datos para gráficos
router.get('/clientes/reporte', async (req, res) => {
    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const [resSexo, resEjercicio] = await Promise.all([
            conexion.execute(
                `SELECT sexo, COUNT(*) AS total
                 FROM   clientes
                 WHERE  activo = 1 AND sexo IS NOT NULL
                 GROUP  BY sexo`,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            ),
            conexion.execute(
                `SELECT tipo_ejercicio, COUNT(*) AS total
                 FROM   clientes
                 WHERE  activo = 1 AND tipo_ejercicio IS NOT NULL
                 GROUP  BY tipo_ejercicio
                 ORDER  BY total DESC`,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            )
        ]);

        res.json({
            porSexo:      resSexo.rows,
            porEjercicio: resEjercicio.rows
        });

    } catch (err) {
        console.error('[CLIENTES REPORTE]', err.message);
        res.status(500).json({ success: false, message: 'Error al obtener reporte' });
    } finally {
        if (conexion) await conexion.close();
    }
});

// POST /api/clientes — crear nuevo
router.post('/clientes', async (req, res) => {
    const { nombre, apellido, telefono, sexo, fecha_nacimiento, tipo_ejercicio, ci } = req.body;

    if (!nombre || !apellido) {
        return res.status(400).json({ success: false, message: 'Nombre y apellido son obligatorios' });
    }

    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        await conexion.execute(
            `INSERT INTO clientes (ci, nombre, apellido, telefono, sexo, fecha_nacimiento, tipo_ejercicio)
             VALUES (:ci, :nombre, :apellido, :telefono, :sexo,
                     TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'), :tipo_ejercicio)`,
            {
                ci,
                nombre,
                apellido,
                telefono:         telefono         || null,
                sexo:             sexo             || null,
                fecha_nacimiento: fecha_nacimiento || null,
                tipo_ejercicio:   tipo_ejercicio   || null
            },
            { autoCommit: true }
        );

        res.json({ success: true, message: 'Cliente creado correctamente' });

    } catch (err) {
        console.error('[CLIENTES POST]', err.message);
        res.status(500).json({ success: false, message: 'Error al crear cliente' });
    } finally {
        if (conexion) await conexion.close();
    }
});

// PUT /api/clientes/:id — actualizar
router.put('/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, telefono, activo, sexo, fecha_nacimiento, tipo_ejercicio, ci } = req.body;

    if (!nombre || !apellido) {
        return res.status(400).json({ success: false, message: 'Nombre y apellido son obligatorios' });
    }

    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resultado = await conexion.execute(
            `UPDATE clientes
             SET    ci               = :ci,
                    nombre           = :nombre,
                    apellido         = :apellido,
                    telefono         = :telefono,
                    activo           = :activo,
                    sexo             = :sexo,
                    fecha_nacimiento = TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'),
                    tipo_ejercicio   = :tipo_ejercicio
             WHERE  cliente_id = :id`,
            {
                ci,
                nombre,
                apellido,
                telefono:         telefono         || null,
                activo:           activo           ?? 1,
                sexo:             sexo             || null,
                fecha_nacimiento: fecha_nacimiento || null,
                tipo_ejercicio:   tipo_ejercicio   || null,
                id
            },
            { autoCommit: true }
        );

        if (resultado.rowsAffected === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        res.json({ success: true, message: 'Cliente actualizado correctamente' });

    } catch (err) {
        console.error('[CLIENTES PUT]', err.message);
        res.status(500).json({ success: false, message: 'Error al actualizar cliente' });
    } finally {
        if (conexion) await conexion.close();
    }
});

// DELETE /api/clientes/:id — desactivar
router.delete('/clientes/:id', async (req, res) => {
    const { id } = req.params;

    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resultado = await conexion.execute(
            `UPDATE clientes SET activo = 0 WHERE cliente_id = :id`,
            { id },
            { autoCommit: true }
        );

        if (resultado.rowsAffected === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        res.json({ success: true, message: 'Cliente desactivado correctamente' });

    } catch (err) {
        console.error('[CLIENTES DELETE]', err.message);
        res.status(500).json({ success: false, message: 'Error al desactivar cliente' });
    } finally {
        if (conexion) await conexion.close();
    }
});

module.exports = router;