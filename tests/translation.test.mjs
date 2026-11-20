import test from 'node:test';
import assert from 'node:assert/strict';
import {t,setLanguage} from '../dist/i18n.mjs';
import {spanish} from '../dist/es.mjs';
test('Spanish catalog and dynamic messages translate without changing values',()=>{
 setLanguage('es');
 for(const [english,translation] of Object.entries(spanish))assert.equal(t(english),translation);
 assert.equal(t('LAUNCH RUN 12'),'INICIAR CARRERA 12');
 assert.equal(t('279 hp engine'),'Motor de 279 hp');
 assert.equal(t('Driving force 5,400 N · Air drag 900 N'),'Fuerza motriz 5,400 N · Resistencia del aire 900 N');
 assert.equal(t('Crashed at 625 m. Your 600 m build score stays 16.63 s.'),'Chocaste a los 625 m. Tu tiempo a los 600 m sigue siendo 16.63 s.');
 assert.equal(t('Engine torque (N·m)'),'Par motor (N·m)');
 assert.equal(t('– – Installed package'),'– – Opción instalada');
 setLanguage('en');assert.equal(t('LAUNCH RUN 12'),'LAUNCH RUN 12');
});
