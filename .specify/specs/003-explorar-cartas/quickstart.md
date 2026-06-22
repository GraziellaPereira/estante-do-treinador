# Quickstart: Explorar Cartas

## Pré-requisitos

- Rodar o backend local:

```powershell
npm run server
```

- Rodar o app Expo:

```powershell
npm start
```

## Validação manual

1. Fazer login com um usuário existente do `json-server/db.json`, por exemplo `admin` / `1234`.
2. Na Home, tocar em `Explorar`.
3. Confirmar que a tela abre sem o alerta `Em breve`.
4. Buscar por nome, por exemplo `Pikachu`.
5. Buscar por código, por exemplo `SV1-036`.
6. Aplicar filtros de coleção, Pokemon e tipo, isolados e combinados.
7. Confirmar que combinações sem resultado exibem estado vazio.
8. Tocar em uma carta e confirmar a tela de detalhe com imagem e metadados.
9. Adicionar uma carta à Wishlist pela lista.
10. Adicionar a mesma carta novamente e confirmar que não duplica em `json-server/db.json`.
11. Adicionar uma carta pela tela de detalhe.
12. Confirmar que nenhum fluxo de Scanner grava na Wishlist neste recorte.

## Observação sobre Web

O script `npm run web` exige `react-native-web`. Se a validação for feita no navegador, instale essa dependência compatível com a versão do Expo antes de abrir `http://localhost:8081`.
