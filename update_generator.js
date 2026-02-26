const fs = require('fs');
let content = fs.readFileSync('server/services/green-entries-generator.ts', 'utf8');

content = content.replace(
  '  monetaryValue: number;\n  co2Equivalent: number;',
  `  monetaryValue: number;
  debeCuenta?: string;
  debeNombre?: string;
  debeMonto?: number;
  haberCuenta?: string;
  haberNombre?: string;
  haberMonto?: number;
  co2Equivalent: number;`
);

content = content.replace(
  /monetaryValue: totalMonto,/g,
  `monetaryValue: totalMonto,
        debeCuenta: "CTA-VERDE",
        debeNombre: clas.category,
        debeMonto: totalMonto,
        haberCuenta: "CTA-PROV",
        haberNombre: "Proveedores",
        haberMonto: totalMonto,`
);

content = content.replace(
  /monetaryValue: item\.monto_total,/g,
  `monetaryValue: item.monto_total,
        debeCuenta: "CTA-VERDE",
        debeNombre: category,
        debeMonto: item.monto_total,
        haberCuenta: "CTA-PROV",
        haberNombre: "Proveedores",
        haberMonto: item.monto_total,`
);

content = content.replace(
  /monetaryValue: data\.totalMonto,/g,
  `monetaryValue: data.totalMonto,
        debeCuenta: "CTA-CLIENTE",
        debeNombre: "Clientes",
        debeMonto: data.totalMonto,
        haberCuenta: "CTA-VERDE-ING",
        haberNombre: isGuia ? "Transporte" : "Emisiones",
        haberMonto: data.totalMonto,`
);

fs.writeFileSync('server/services/green-entries-generator.ts', content);
