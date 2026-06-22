import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const REPORT_DIR = path.resolve(__dirname, '..', 'test-results');
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');

test.beforeAll(async () => {
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test('Cadastro - sucesso e login', async ({ page }) => {
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8081';

  // Garantir estado limpo: remover usuário 'TesteAutomatizado' se existir
  try {
    const resp = await page.request.get(`${baseUrl}/users?usuario=TesteAutomatizado`);
    if (resp.ok) {
      const existing = await resp.json();
      for (const u of existing || []) {
        if (u && u.id) {
          await page.request.delete(`${baseUrl}/users/${u.id}`);
        }
      }
    }
  } catch (e) {
    // ignorar erros de limpeza
  }

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  // Navegar para tela de cadastro
  await page.getByText('Nao tem conta? Cadastre-se').click();

  // Preencher campos com dados válidos
  await page.getByPlaceholder('Digite seu usuário').fill('TesteAutomatizado');
  await page.getByPlaceholder('Digite sua senha').fill('12345@');
  await page.getByPlaceholder('Confirme sua senha').fill('12345@');

  // Interceptar alert do browser para capturar mensagem
  await page.evaluate(() => {
    // @ts-ignore
    (window as any).__lastAlert = null;
    // @ts-ignore
    window.alert = (m: any) => {
      try {
        // @ts-ignore
        (window as any).__lastAlert = String(m);
        let el = document.getElementById('__playwright_alert_overlay');
        if (!el) {
          el = document.createElement('div');
          el.id = '__playwright_alert_overlay';
          Object.assign(el.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#2b6cb0',
            color: '#fff',
            padding: '12px 20px',
            zIndex: '999999',
            borderRadius: '8px',
            fontSize: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          });
          document.body.appendChild(el);
        }
        el.textContent = String(m);
      } catch (e) {
        // ignore
      }
    };
  });

  // Clicar em Cadastrar
  await page.getByText('Cadastrar').click();

  // Aguardar alerta (window.__lastAlert) ou mudança para modo 'login' (botão 'Entrar')
  await Promise.race([
    page.waitForFunction(() => (window as any).__lastAlert != null, null, { timeout: 5000 }).catch(() => {}),
    page.waitForSelector('text=Entrar', { timeout: 5000 }).catch(() => {}),
  ]);

  // Tentar ler mensagem do alerta interceptado
  let regMsg = await page.evaluate(() => {
    // @ts-ignore
    return (window as any).__lastAlert as string | null;
  });
  if (!regMsg) {
    // fallback: ler conteúdo do overlay injetado
    try {
      const overlay = await page.locator('#__playwright_alert_overlay').textContent();
      regMsg = overlay;
    } catch (e) {
      // continuar; regMsg permanece possivelmente null
    }
  }
  // Se o usuário já existe, tentar remover via API e tentar cadastrar novamente
  if (regMsg && regMsg.toLowerCase().includes('ja existe')) {
    try {
      const resp = await page.request.get(`${baseUrl}/users?usuario=TesteAutomatizado`);
      if (resp.ok) {
        const existing = await resp.json();
        for (const u of existing || []) {
          if (u && u.id) {
            await page.request.delete(`${baseUrl}/users/${u.id}`);
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // tentar cadastrar novamente
    await page.getByText('Cadastrar').click();
    await Promise.race([
      page.waitForFunction(() => (window as any).__lastAlert != null, null, { timeout: 5000 }).catch(() => {}),
      page.waitForSelector('text=Entrar', { timeout: 5000 }).catch(() => {}),
    ]);
    try {
      regMsg = await page.evaluate(() => {
        // @ts-ignore
        return (window as any).__lastAlert as string | null;
      });
    } catch (e) {
      regMsg = null;
    }
    if (!regMsg) {
      try {
        regMsg = await page.locator('#__playwright_alert_overlay').textContent();
      } catch (e) {
        regMsg = null;
      }
    }
  }

  expect(regMsg).toContain('Cadastro realizado');

  // Injetar overlay mais visível e tirar screenshot do registro
  await page.evaluate((m: string | null) => {
    const text = m || 'Sucesso';
    let el = document.getElementById('__playwright_alert_overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = '__playwright_alert_overlay';
      Object.assign((el as HTMLElement).style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#2b6cb0',
        color: '#fff',
        padding: '14px 24px',
        borderRadius: '10px',
        zIndex: '2147483647',
        fontSize: '16px',
        fontWeight: '700'
      });
      document.body.appendChild(el);
    }
    el.textContent = text;
  }, regMsg);

  await page.waitForTimeout(200);
  const screenshotReg = path.join(SCREENSHOT_DIR, 'cadastro-senha-sucesso.png');
  await page.screenshot({ path: screenshotReg, fullPage: true });

  // Agora efetuar login com o usuário criado
  await page.getByPlaceholder('Digite seu usuário').fill('TesteAutomatizado');
  await page.getByPlaceholder('Digite sua senha').fill('12345@');
  await page.getByText('Entrar').click();

  // Aguardar indicação na UI de que o usuário foi direcionado para a tela Home
  await page.getByText('Olá, TesteAutomatizado!').waitFor({ timeout: 5000 });
  expect(await page.getByText('Olá, TesteAutomatizado!').isVisible()).toBeTruthy();

  const screenshotHome = path.join(SCREENSHOT_DIR, 'cadastro-login-sucesso-home.png');
  await page.screenshot({ path: screenshotHome, fullPage: true });

  // Gerar relatório HTML com ambas evidências
  try {
    const imgReg = fs.readFileSync(screenshotReg).toString('base64');
    const imgHome = fs.readFileSync(screenshotHome).toString('base64');
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Relatório - Cadastro Sucesso e Login</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;background:#0f0f0f;color:#f2f2f2;padding:20px} .card{background:#151516;padding:18px;border-radius:8px;max-width:1000px} img{max-width:100%;height:auto;border-radius:6px;margin-top:12px}</style>
  </head>
  <body>
    <div class="card">
      <h1>Teste: Cadastro com sucesso e login</h1>
      <p><strong>Descrição:</strong> Cadastrar usuário "TesteAutomatizado" com senha "12345@" e efetuar login com sucesso.</p>
      <p><strong>Mensagem de cadastro:</strong></p>
      <pre style="background:#0b0b0b;padding:10px;border-radius:6px;color:#ffd">${regMsg}</pre>
      <h2>Evidência - Registro</h2>
      <img src="data:image/png;base64,${imgReg}" alt="registro" />
      <h2>Evidência - Tela Home após login</h2>
      <img src="data:image/png;base64,${imgHome}" alt="home" />
    </div>
  </body>
</html>`;

    fs.writeFileSync(path.join(REPORT_DIR, 'cadastro-sucesso-e-login.html'), html, 'utf-8');
    const reportText = `Teste: Cadastro sucesso e login\nMensagem de cadastro: ${regMsg}\nScreenshot registro: ${screenshotReg}\nScreenshot home: ${screenshotHome}\n`;
    fs.writeFileSync(path.join(REPORT_DIR, 'cadastro-sucesso-e-login.txt'), reportText, 'utf-8');
  } catch (err) {
    console.warn('Falha ao gerar relatório HTML de sucesso', err);
  }
});

test('Cadastro - senhas não conferem', async ({ page }) => {
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8081';

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  // Clique no link de cadastro
  await page.getByText('Nao tem conta? Cadastre-se').click();

  // Preencher campos
  await page.getByPlaceholder('Digite seu usuário').fill('TesteAutomatizado');
  await page.getByPlaceholder('Digite sua senha').fill('12345@');
  await page.getByPlaceholder('Confirme sua senha').fill('1234');

  // Interceptar alert do browser (web) para evitar timeouts com dialogs nativos
  await page.evaluate(() => {
    // @ts-ignore
    (window as any).__lastAlert = null;
    // override window.alert to store message and render a visible overlay
    // do NOT call the native alert to avoid blocking modal behavior
    // @ts-ignore
    window.alert = (m: any) => {
      try {
        // @ts-ignore
        (window as any).__lastAlert = String(m);
        let el = document.getElementById('__playwright_alert_overlay');
        if (!el) {
          el = document.createElement('div');
          el.id = '__playwright_alert_overlay';
          Object.assign(el.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#b00020',
            color: '#fff',
            padding: '12px 20px',
            zIndex: '999999',
            borderRadius: '8px',
            fontSize: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          });
          document.body.appendChild(el);
        }
        el.textContent = String(m);
      } catch (e) {
        // ignore
      }
    };
  });

  // Clicar em Cadastrar
  await page.getByText('Cadastrar').click();

  // Ler alerta interceptado (aguardar um pouco caso seja assíncrono)
  await page.waitForTimeout(500);
  const msg = await page.evaluate(() => {
    // @ts-ignore
    return (window as any).__lastAlert as string | null;
  });
  expect(msg).toContain('As senhas nao conferem');

  // Injetar overlay visível na página com a mensagem do alerta (para aparecer no screenshot)
  await page.evaluate((m: string | null) => {
    const text = m || 'Alerta';
    let el = document.getElementById('__playwright_alert_overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = '__playwright_alert_overlay';
      Object.assign((el as HTMLElement).style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#ffd',
        color: '#000',
        padding: '12px 20px',
        borderRadius: '8px',
        zIndex: '2147483647',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      });
      document.body.appendChild(el);
    }
    el.textContent = text;
  }, msg);

  // Pequena espera para garantir renderização do overlay
  await page.waitForTimeout(200);

  // Screenshot após erro (com overlay)
  const screenshotPath = path.join(SCREENSHOT_DIR, 'cadastro-senha-nao-conferem.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Anexar mensagem ao relatório (arquivo simples)
  const reportText = `Teste: Cadastro - senhas não conferem\nMensagem de alerta: ${msg}\nScreenshot: ${screenshotPath}\n`;
  fs.writeFileSync(path.join(REPORT_DIR, 'cadastro-senha-nao-conferem.txt'), reportText, 'utf-8');

  // Gerar relatório HTML com evidência embutida (base64)
  try {
    const imgData = fs.readFileSync(screenshotPath).toString('base64');
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Relatório - Cadastro (senhas não conferem)</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;background:#0f0f0f;color:#f2f2f2;padding:20px} .card{background:#151516;padding:18px;border-radius:8px;max-width:900px} img{max-width:100%;height:auto;border-radius:6px;margin-top:12px}</style>
  </head>
  <body>
    <div class="card">
      <h1>Teste: Cadastro - senhas não conferem</h1>
      <p><strong>Descrição:</strong> Navegar para cadastro, preencher usuário "TesteAutomatizado", senha "12345@" e confirmar senha "1234", clicar em Cadastrar e validar mensagem de erro.</p>
      <p><strong>Mensagem de alerta capturada:</strong></p>
      <pre style="background:#0b0b0b;padding:10px;border-radius:6px;color:#ffd">${msg}</pre>
      <h2>Evidência (screenshot)</h2>
      <img src="data:image/png;base64,${imgData}" alt="screenshot" />
    </div>
  </body>
</html>`;

    fs.writeFileSync(path.join(REPORT_DIR, 'cadastro-senha-nao-conferem.html'), html, 'utf-8');
  } catch (err) {
    // se falhar, não interrompe o teste
    console.warn('Falha ao gerar relatório HTML', err);
  }
});
