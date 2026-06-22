import { Page } from '@playwright/test';
import { safeLog } from '../../src/utils/safeLog';
import path from 'path';
import fs from 'fs';

export const REPORT_DIR = path.resolve(__dirname, '..', '..', 'test-results');
export const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');

export const SCREENSHOT_ARCHIVE_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'e2e-screenshots'
);

export const AUTH_STATE_PATH = path.resolve(__dirname, 'auth-state.json');
export const LOGIN_DATA_PATH = path.resolve(__dirname, 'login.json');

export async function ensureDirs() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  if (!fs.existsSync(SCREENSHOT_ARCHIVE_DIR)) {
    fs.mkdirSync(SCREENSHOT_ARCHIVE_DIR, { recursive: true });
  }
}

export function screenshotPath(name: string) {
  return path.join(SCREENSHOT_ARCHIVE_DIR, name);
}

export async function preserveScreenshot(screenshotPathValue: string) {
  if (!fs.existsSync(SCREENSHOT_ARCHIVE_DIR)) {
    fs.mkdirSync(SCREENSHOT_ARCHIVE_DIR, { recursive: true });
  }

  try {
    let attempts = 0;

    while (!fs.existsSync(screenshotPathValue) && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }

    if (fs.existsSync(screenshotPathValue)) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const fileName = path.basename(screenshotPathValue);
      const archivePath = path.join(SCREENSHOT_ARCHIVE_DIR, fileName);

      const fileContent = fs.readFileSync(screenshotPathValue);
      fs.writeFileSync(archivePath, fileContent);

      safeLog(`✅ Screenshot preservado em arquivo: ${fileName}`);
    } else {
      console.warn(`⚠️ Screenshot não encontrada após espera: ${screenshotPathValue}`);
    }
  } catch (e) {
    console.warn(`⚠️ Erro ao preservar screenshot: ${e}`);
  }
}

export async function injectAlertCapture(page: Page) {
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

    // @ts-ignore
    window.confirm = () => true;
  });
}

export function saveLoginData(username: string, password: string) {
  fs.writeFileSync(
    LOGIN_DATA_PATH,
    JSON.stringify(
      {
        username,
        password
      },
      null,
      2
    )
  );
}

export function readLoginData() {
  if (!fs.existsSync(LOGIN_DATA_PATH)) {
    return {
      username: 'TesteSpec2NovaVersao',
      password: '12345@'
    };
  }

  try {
    const raw = fs.readFileSync(LOGIN_DATA_PATH, 'utf8');
    const data = JSON.parse(raw);

    return {
      username: String(data.username || 'TesteSpec2NovaVersao'),
      password: String(data.password || '12345@')
    };
  } catch (e) {
    return {
      username: 'TesteSpec2NovaVersao',
      password: '12345@'
    };
  }
}

export async function saveAuthState(page: Page) {
  await page.context().storageState({ path: AUTH_STATE_PATH });
}

export async function isLoggedIn(page: Page) {
  return await page
    .getByText(/Olá,|Explorar|Nova cole[cç][aã]o|Minhas cole[cç][oõ]es|Todas|Por set|Sair/i)
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);
}

export async function ensureLoggedIn(
  page: Page,
  baseUrl: string,
  fallbackUser = 'TesteSpec2NovaVersao',
  fallbackPass = '12345@'
) {
  await ensureDirs();

  const savedLogin = readLoginData();

  const username = savedLogin?.username || fallbackUser;
  const password = savedLogin?.password || fallbackPass;

  await page.goto(baseUrl);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  if (await isLoggedIn(page)) {
    await saveAuthState(page);
    return username;
  }

  const inputUsuario = page.getByPlaceholder('Digite seu usuário');
  const inputSenha = page.getByPlaceholder('Digite sua senha');

  await inputUsuario.waitFor({ state: 'visible', timeout: 7000 });

  await inputUsuario.fill('');
  await inputUsuario.fill(username);

  await inputSenha.fill('');
  await inputSenha.fill(password);

  const botaoEntrarPorRole = page.getByRole('button', { name: /Entrar/i }).first();
  const botaoEntrarPorTexto = page.getByText('Entrar').first();

  if (await botaoEntrarPorRole.isVisible({ timeout: 1000 }).catch(() => false)) {
    await botaoEntrarPorRole.click();
  } else {
    await botaoEntrarPorTexto.click();
  }

  const loginConfirmado = await page
    .getByText(new RegExp(`Olá,\\s*${username}!`, 'i'))
    .waitFor({ timeout: 7000 })
    .then(() => true)
    .catch(() => false);

  const loginConfirmadoGenerico = await isLoggedIn(page);

  if (loginConfirmado || loginConfirmadoGenerico) {
    saveLoginData(username, password);
    await saveAuthState(page);
    return username;
  }

  const erroLogin = await page
    .getByText(/Login inv[aá]lido|Usu[aá]rio ou senha|senha incorreta/i)
    .isVisible()
    .catch(() => false);

  const failShot = screenshotPath(`login-failed-${Date.now()}.png`);

  try {
    await page.screenshot({ path: failShot, fullPage: true });
  } catch (e) {
    // ignore
  }

  if (erroLogin) {
    throw new Error(
      `Login inválido para usuário "${username}". Confira se o usuário existe e se a senha está correta. Screenshot: ${failShot}`
    );
  }

  throw new Error(
    `Login não confirmou para usuário "${username}". Screenshot: ${failShot}`
  );
}