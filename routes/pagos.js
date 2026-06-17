const express  = require('express');
const oracledb = require('oracledb');
const config   = require('../js/db');
const router   = express.Router();

// GET /api/pagos/reporte — totales por membresía (para gráfico)
router.get('/pagos/reporte', async (req, res) => {
    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resultado = await conexion.execute(
            `SELECT m.descripcion          AS membresia,
                    COUNT(*)               AS total_pagos,
                    SUM(m.precio)          AS total_recaudado
             FROM   pagos p
             JOIN   membresias m ON m.membresia_id = p.membresia_id
             GROUP  BY m.descripcion
             ORDER  BY total_recaudado DESC`,
            {},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(resultado.rows);

    } catch (err) {
        console.error('[PAGOS REPORTE]', err.message);
        res.status(500).json({ success: false, message: 'Error al obtener reporte' });
    } finally {
        if (conexion) await conexion.close();
    }
});

// GET /api/pagos — listar todos con vencimiento
router.get('/pagos', async (req, res) => {
    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resultado = await conexion.execute(
            `SELECT p.pago_id,
                    c.nombre || ' ' || c.apellido          AS cliente,
                    m.descripcion                          AS membresia,
                    m.precio,
                    p.fecha_pago,
                    p.fecha_inicio,
                    p.fecha_inicio + m.duracion            AS fecha_vencimiento,
                    p.tipo_operacion,
                    CASE
                        WHEN SYSDATE > p.fecha_inicio + m.duracion THEN 'Vencido'
                        ELSE 'Vigente'
                    END                                    AS estado_pago
            FROM   prg2.pagos p
            JOIN   prg2.clientes   c ON c.cliente_id   = p.cliente_id
            JOIN   prg2.membresias m ON m.membresia_id = p.membresia_id
            WHERE  p.activo = 1
            ORDER  BY p.pago_id`,
            {},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(resultado.rows);

    } catch (err) {
        console.error('[PAGOS GET]', err.message);
        res.status(500).json({ success: false, message: 'Error al obtener pagos' });
    } finally {
        if (conexion) await conexion.close();
    }
});

// POST /api/pagos — registrar nuevo pago
router.post('/pagos', async (req, res) => {
    const { cliente_id, membresia_id } = req.body;

    if (!cliente_id || !membresia_id) {
        return res.status(400).json({ success: false, message: 'Cliente y membresía son obligatorios' });
    }

    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resVigente = await conexion.execute(
            `SELECT MAX(fecha_inicio + m.duracion) AS fin_vigente
             FROM   prg2.pagos p
             JOIN   prg2.membresias m ON m.membresia_id = p.membresia_id
             WHERE  p.cliente_id = :cliente_id
             AND    p.activo = 1
             AND    (p.fecha_inicio + m.duracion) > SYSDATE`,
            { cliente_id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const finVigente = resVigente.rows[0].FIN_VIGENTE;
        const fechaInicio = finVigente ? `DATE '${new Date(finVigente).toISOString().split('T')[0]}'` : 'SYSDATE';
        const tipoOp = finVigente ? 'RENOVACION' : 'ALTA';

        const resMem = await conexion.execute(
            `SELECT membresia_id FROM prg2.membresias WHERE membresia_id = :membresia_id`,
            { membresia_id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const memActual = resMem.rows[0];
        const tipo = (finVigente && memActual) ? 'CAMBIO_PLAN' : tipoOp;

        await conexion.execute(
            `INSERT INTO prg2.pagos (cliente_id, membresia_id, fecha_pago, fecha_inicio, tipo_operacion)
             VALUES (:cliente_id, :membresia_id, SYSDATE, ${fechaInicio}, :tipo_operacion)`,
            { cliente_id, membresia_id, tipo_operacion: tipo },
            { autoCommit: true }
        );

        res.json({ success: true, message: 'Pago registrado correctamente' });

    } catch (err) {
        console.error('[PAGOS POST]', err.message);
        res.status(500).json({ success: false, message: 'Error al registrar pago' });
    } finally {
        if (conexion) await conexion.close();
    }
});

// DELETE /api/pagos/:id — eliminar pago
router.delete('/pagos/:id', async (req, res) => {
    const { id } = req.params;

    let conexion;
    try {
        conexion = await oracledb.getConnection(config);

        const resultado = await conexion.execute(
            `UPDATE prg2.pagos SET activo = 0 WHERE pago_id = :id`,
            { id },
            { autoCommit: true }
        );

        if (resultado.rowsAffected === 0) {
            return res.status(404).json({ success: false, message: 'Pago no encontrado' });
        }

        res.json({ success: true, message: 'Pago anulado correctamente' });

    } catch (err) {
        console.error('[PAGOS DELETE]', err.message);
        res.status(500).json({ success: false, message: 'Error al anular pago' });
    } finally {
        if (conexion) await conexion.close();
    }
});

module.exports = router;