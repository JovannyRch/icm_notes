<?php

namespace App\Support;

use App\Models\Note;

/**
 * El corte lleva el total de COMPRA de cada nota (lo que costó la mercancía). Quien no
 * puede ver costos (cajero) nunca lo recibe; al guardar, el servidor lo vuelve a poner
 * desde la base de datos para que el corte del dueño quede completo.
 */
class CorteCosts
{
    public const FIELDS = ['purchase_total', 'purchase_status'];

    /** Quita los campos de compra de una lista de notas (modelos o arreglos). */
    public static function strip(iterable $notes): array
    {
        $out = [];
        foreach ($notes as $note) {
            $row = $note instanceof Note ? $note->toArray() : (array) $note;
            $out[] = array_diff_key($row, array_flip(self::FIELDS));
        }

        return $out;
    }

    /** Pone el total de compra de cada nota del snapshot desde la base (fuente de verdad). */
    public static function fill(array $notes): array
    {
        $ids = array_filter(array_column($notes, 'id'));
        $purchases = Note::whereIn('id', $ids)->pluck('purchase_total', 'id');

        return array_map(function ($row) use ($purchases) {
            if (isset($row['id']) && $purchases->has($row['id'])) {
                $row['purchase_total'] = (float) $purchases[$row['id']];
            }

            return $row;
        }, $notes);
    }
}
