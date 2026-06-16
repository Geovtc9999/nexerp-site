/**
 * Validation du JSON-LD entity-page de index.html
 * - Validité JSON
 * - Cohérence des @id (toute référence {"@id":...} doit résoudre vers un nœud défini)
 * - Inventaire des types et placeholders
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

// Extraire tous les blocs <script type="application/ld+json">…</script>
const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1].trim());
console.log(`Blocs JSON-LD trouvés : ${blocks.length}`);

let hadError = false;

blocks.forEach((raw, i) => {
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        hadError = true;
        console.error(`\n❌ Bloc #${i + 1} : JSON INVALIDE — ${e.message}`);
        return;
    }
    console.log(`\n✓ Bloc #${i + 1} : JSON valide`);

    const graph = data['@graph'] || [data];

    // Collecte des @id définis et des types
    const defined = new Set();
    const types = [];
    graph.forEach(node => {
        if (node['@id']) defined.add(node['@id']);
        const t = node['@type'];
        types.push(Array.isArray(t) ? t.join('+') : t);
    });

    console.log(`  Entités (${graph.length}) : ${types.join(', ')}`);
    console.log(`  @id définis (${defined.size}) :`);
    defined.forEach(id => console.log(`     • ${id}`));

    // Collecte récursive de toutes les références {"@id":...}
    const refs = [];
    (function walk(obj, defining) {
        if (Array.isArray(obj)) return obj.forEach(o => walk(o, false));
        if (obj && typeof obj === 'object') {
            const keys = Object.keys(obj);
            // un nœud qui DÉFINIT un @id (a un @type) n'est pas une référence
            const isDefinition = '@type' in obj;
            if ('@id' in obj && !isDefinition && keys.length === 1) {
                refs.push(obj['@id']);
            }
            for (const k of keys) walk(obj[k], false);
        }
    })(graph, true);

    // Vérif cohérence
    const unique = [...new Set(refs)];
    console.log(`  Références @id (${refs.length}, ${unique.length} uniques) :`);
    let orphans = 0;
    unique.forEach(ref => {
        const ok = defined.has(ref);
        if (!ok) orphans++;
        console.log(`     ${ok ? '✓' : '❌ ORPHELIN'} ${ref}`);
    });
    if (orphans > 0) {
        hadError = true;
        console.error(`  ❌ ${orphans} référence(s) orpheline(s) — @id non défini dans le graphe.`);
    } else {
        console.log(`  ✓ Toutes les références @id résolvent (0 orphelin).`);
    }

    // Placeholders
    const placeholders = (raw.match(/\[À COMPLÉTER[^\]]*\]/g) || []);
    if (placeholders.length) {
        console.log(`  ⚠ ${placeholders.length} placeholder(s) à compléter :`);
        [...new Set(placeholders)].forEach(p => console.log(`     • ${p}`));
    }
});

console.log(`\n${hadError ? '❌ VALIDATION ÉCHOUÉE' : '✅ VALIDATION RÉUSSIE'}`);
process.exit(hadError ? 1 : 0);
