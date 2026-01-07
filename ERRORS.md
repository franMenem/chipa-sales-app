# Errores y lecciones

- No ocultar la selección de lotes cuando `has_sufficient_ingredients` es false; se pierde la vista de lotes aunque haya stock.
- Verificar siempre la unidad usada en cálculos de costo (base vs unidad de compra) antes de aplicar cambios globales.
- Ajustar stock de producto terminado no revierte consumos de insumos; para eso hay que usar “Revertir producción”.
- Los lotes con `quantity_remaining = 0` no deben mostrarse en fabricación.
- Cuando hay un solo lote disponible, la cantidad requerida debe autocompletarse para evitar errores manuales.
