// Chart.js falso: o jsdom não desenha em canvas; aqui só importa que o app não quebre ao pedir um gráfico.
export default class Chart{ constructor(c,cfg){ this.config=cfg; } destroy(){} update(){} static register(){} static getChart(){return null;} }
Chart.defaults = { plugins:{legend:{labels:{}}}, font:{} };
