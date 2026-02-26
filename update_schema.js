const fs = require('fs');
let content = fs.readFileSync('shared/schema.ts', 'utf8');
content = content.replace(
  '  physicalUnit: text("physical_unit"),\n  monetaryValue: real("monetary_value"),',
  `  physicalUnit: text("physical_unit"),
  debeCuenta: text("debe_cuenta"),
  debeNombre: text("debe_nombre"),
  debeMonto: real("debe_monto"),
  haberCuenta: text("haber_cuenta"),
  haberNombre: text("haber_nombre"),
  haberMonto: real("haber_monto"),
  consumoAguaM3: real("consumo_agua_m3"),
  residuosKg: real("residuos_kg"),
  alcanceGei: integer("alcance_gei"),
  monetaryValue: real("monetary_value"),`
);
fs.writeFileSync('shared/schema.ts', content);
