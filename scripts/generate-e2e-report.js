const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.resolve(__dirname, '..', 'test-results');
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');
const SCREENSHOT_ARCHIVE_DIR = path.join(REPORT_DIR, 'screenshots-archive');
const OUT_FILE = path.join(REPORT_DIR, 'e2e-fluxo-relatorio.html');

// Garantir que o diretório de arquivo existe
if (!fs.existsSync(SCREENSHOT_ARCHIVE_DIR)) {
  fs.mkdirSync(SCREENSHOT_ARCHIVE_DIR, { recursive: true });
}

const steps = [
  'Cadastro: senhas diferentes (erro)',
  'Cadastro: novo usuário (sucesso ou já existe)',
  'Login inválido (erro)',
  'Login com usuário criado (sucesso)',
  'Alternar abas: Padrao/Todas/Por set',
  'Criar coleção sem nome (validação)',
  'Salvar carta sem dados (validação)',
  'Criar carta via API',
  'Criar coleção via UI e adicionar carta',
  'Abrir carta adicionada e excluir',
  'Explorar -> Ver todas coleções',
  'Ordenar e aplicar filtros',
  'Pesquisar por diancie',
  'Abrir primeira carta e adicionar à wishlist',
  'Ir para wishlist e remover a carta',
];

function fileForStep(i) {
  const prefix = String(i).padStart(2, '0') + '-';
  
  // Procurar primeiro em screenshots (mais recente)
  if (fs.existsSync(SCREENSHOT_DIR)) {
    const files = fs.readdirSync(SCREENSHOT_DIR);
    for (const f of files) {
      if (f.startsWith(prefix) && (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))) {
        return path.join(SCREENSHOT_DIR, f);
      }
    }
  }
  
  // Se não encontrar, procurar em arquivo
  if (fs.existsSync(SCREENSHOT_ARCHIVE_DIR)) {
    const files = fs.readdirSync(SCREENSHOT_ARCHIVE_DIR);
    for (const f of files) {
      if (f.startsWith(prefix) && (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))) {
        return path.join(SCREENSHOT_ARCHIVE_DIR, f);
      }
    }
  }
  
  return null;
}

function imgTag(file) {
  if (!file) return '<div style="color:#ffcc00">(não executado)</div>';
  try {
    const data = fs.readFileSync(file);
    const b64 = data.toString('base64');
    return `<img style="max-width:100%;box-shadow:0 6px 18px rgba(0,0,0,.6);border-radius:8px" src="data:image/png;base64,${b64}"/>`;
  } catch (e) {
    return '<div style="color:#ff6666">(erro ao ler imagem)</div>';
  }
}

function now() { return new Date().toISOString(); }

let html = `<!doctype html><html><head><meta charset="utf-8"><title>Relatório E2E - Fluxo</title></head><body style="background:#0b0b0b;color:#f5f5f5;font-family:Arial;margin:24px">
<h1 style="color:#ffd966">Relatório E2E - Fluxo de Navegação</h1>
<p>Gerado em: ${now()}</p>
<p>Este relatório é atualizado ao executar <code>node scripts/generate-e2e-report.js</code>. Ele incorpora os screenshots disponíveis em <code>test-results/screenshots/</code>.</p>
`;

for (let i = 1; i <= steps.length; i++) {
  const file = fileForStep(i);
  html += `<section style="margin-bottom:28px;padding:18px;border-radius:8px;background:linear-gradient(180deg,#111 0%,#070707 100%)">`;
  html += `<h2 style="color:#ffd966">Step ${i}: ${steps[i-1]}</h2>`;
  html += `<div style="margin:8px 0">${imgTag(file)}</div>`;
  if (!file) {
    html += `<div style="color:#aaa">Status: não executado / sem evidência</div>`;
  } else {
    html += `<div style="color:#9fd3a0">Status: screenshot presente</div>`;
  }
  html += `</section>`;
}

html += `<footer style="color:#888;margin-top:40px">Relatório gerado por script local</footer></body></html>`;

try {
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html, 'utf-8');
  
  // Copiar screenshots do diretório atual para arquivo (backup permanente)
  if (fs.existsSync(SCREENSHOT_DIR)) {
    const files = fs.readdirSync(SCREENSHOT_DIR);
    for (const f of files) {
      if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) {
        const src = path.join(SCREENSHOT_DIR, f);
        const dst = path.join(SCREENSHOT_ARCHIVE_DIR, f);
        fs.copyFileSync(src, dst);
      }
    }
  }
  
  console.log('Relatório gerado em:', OUT_FILE);
} catch (e) {
  console.error('Falha ao gerar relatório:', e);
  process.exit(1);
}
