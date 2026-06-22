# <img src="https://i.pinimg.com/736x/80/9f/be/809fbea32a94ca2ffdefe3060490121a.jpg" width="30"/> Estante do Treinador

Bem-vindo(a) ao **Estante do Treinador**! 🃏✨

Este é um aplicativo mobile criado para ajudar treinadores e colecionadores a organizarem suas cartas de forma simples, bonita e divertida. A ideia do projeto é transformar a experiência de colecionar cartas em algo mais visual, prático e personalizado.

Com o app, o usuário pode cadastrar cartas na sua estante, explorar novas cartas, montar coleções, acompanhar o progresso dos sets e salvar cartas desejadas na wishlist.

> Projeto desenvolvido para fins acadêmicos e de portfólio.
> Este projeto não é oficial e não possui vínculo com marcas ou empresas detentoras dos direitos das cartas.

---

## 📱 Sobre o projeto

O **Estante do Treinador** nasceu com a proposta de ser uma estante digital para cartas colecionáveis.

Em vez de anotar cartas em planilhas ou depender apenas da memória, o usuário consegue visualizar sua coleção de forma organizada, com imagens, raridades, sets, wishlist e informações detalhadas de cada carta.

O app possui uma interface em tema escuro com detalhes dourados, buscando passar uma sensação de coleção premium e aconchegante.

---

## 💛 Funcionalidades

* 📚 **Estante de cartas**
  Cadastre cartas que você já possui na sua coleção.

* 🔎 **Explorar cartas**
  Pesquise cartas por nome, código, coleção, tipo ou raridade.

* ⭐ **Wishlist**
  Salve cartas que você ainda deseja conquistar.

* 🗂️ **Coleções personalizadas**
  Crie coleções próprias e organize suas cartas do seu jeito.

* 🧩 **Progresso por set**
  Veja quantas cartas você possui de cada set e acompanhe sua evolução.

* 🖼️ **Detalhes da carta**
  Abra uma carta para visualizar informações completas, imagem, raridade, coleção e outros dados.

* 📅 **Data de captura**
  Ao adicionar uma carta à estante, selecione a data em que ela foi conquistada.

* 📸 **Pastas de fotos**
  Organize fotos da sua coleção, binder ou cartas favoritas.

---

## 🛠️ Tecnologias utilizadas

Este projeto foi desenvolvido com:

* **React Native**
* **Expo**
* **Expo Router**
* **TypeScript**
* **AsyncStorage**
* **JSON Server**
* **API de catálogo de cartas**
* **React Native DateTimePicker**

---

## 🚀 Como rodar o projeto

Antes de começar, você precisa ter instalado:

* Node.js
* npm
* Expo CLI
* Um emulador Android/iOS ou o aplicativo Expo Go no celular

---

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
```

Depois entre na pasta do projeto:

```bash
cd meu-app
```

---

### 2. Instale as dependências

```bash
npm install
```

Caso esteja usando Expo, também é recomendado instalar dependências compatíveis com a versão do projeto:

```bash
npx expo install
```

---

### 3. Inicie a API local

O projeto utiliza um arquivo `db.json` para simular o backend com JSON Server.

Em um terminal separado, rode:

```bash
npx json-server --watch db.json --port 3000
```

A API local ficará disponível em:

```bash
http://localhost:3000
```

Se for testar pelo celular, talvez seja necessário trocar `localhost` pelo IP da sua máquina no arquivo de configuração da API.

---

### 4. Inicie o aplicativo

Em outro terminal, rode:

```bash
npx expo start -c
```

Depois, escolha uma das opções:

* apertar `a` para abrir no Android;
* apertar `i` para abrir no iOS;
* escanear o QR Code com o Expo Go.

---

## 🧭 Como usar o app

### Criando sua conta

Ao abrir o app, faça login ou crie um usuário para acessar sua estante.

Cada usuário possui sua própria coleção, wishlist, pastas e cartas cadastradas.

---

### Adicionando uma carta à estante

1. Acesse a aba **Estante**.
2. Toque em **Adicionar carta**.
3. Digite o código da carta, por exemplo:

```bash
002/131
```

4. Toque em **Buscar carta**.
5. Confira a prévia da carta encontrada.
6. Selecione a **data de captura** pelo calendário.
7. Toque em **Salvar carta**.

Pronto! A carta será adicionada à sua estante. ✨

---

### Explorando cartas

1. Acesse a aba **Explorar**.
2. Pesquise pelo nome, código ou coleção.
3. Use filtros de raridade ou tipo.
4. Toque em uma carta para ver os detalhes.
5. Toque no coração para adicionar a carta à Wishlist.

---

### Usando a Wishlist

A Wishlist serve para guardar cartas que você ainda deseja conquistar.

Na aba **Wishlist**, você pode:

* visualizar as cartas desejadas;
* abrir os detalhes da carta;
* remover cartas da wishlist quando não quiser mais acompanhar.

---

### Criando coleções personalizadas

1. Na Home, toque em **Nova coleção**.
2. Escolha um nome para sua coleção.
3. Abra a coleção criada.
4. Adicione cartas da sua estante.
5. Personalize a coleção como preferir.

---

## 📁 Estrutura básica do projeto

```bash
src/
 ├── app/
 │   ├── home.tsx
 │   ├── explore.tsx
 │   ├── wishlist.tsx
 │   └── card-detail.tsx
 │
 ├── services/
 │   ├── CatalogService.ts
 │   └── WishlistService.ts
 │
 ├── types/
 │   └── explore.ts
 │
 └── utils/
     └── BuscaUtils.ts
```

---

## 🎨 Identidade visual

O app utiliza uma interface com tema escuro e detalhes em dourado, trazendo uma sensação de:

* coleção premium;
* aventura;
* nostalgia;
* organização;
* conquista.

A ideia é que cada carta cadastrada pareça uma pequena vitória dentro da jornada do treinador. 🏆

---

## 📌 Status do projeto

🚧 Projeto em desenvolvimento.

Funcionalidades já implementadas:

* Login de usuário;
* Estante de cartas;
* Busca de cartas;
* Wishlist;
* Detalhes da carta;
* Coleções personalizadas;
* Progresso por set;
* Calendário para data de captura;
* Organização de fotos.

Melhorias futuras:

* Scanner de cartas;
* Melhorias no perfil do usuário;
* Feed de fotos;
* Estatísticas mais detalhadas;
* Sincronização com banco online;
* Melhorias de performance e cache.

---

## 👩‍💻 Desenvolvido por

Projeto desenvolvido por **Grazi** como parte dos estudos em desenvolvimento mobile, TypeScript, React Native e integração com APIs.

Feito com dedicação, café e carinho por coleções. ☕✨

---

## 💛 Considerações finais

O **Estante do Treinador** é mais do que um app de cadastro de cartas.

Ele foi pensado para transformar a coleção do usuário em uma experiência visual, organizada e divertida, ajudando cada treinador a acompanhar sua jornada carta por carta.

Se você também ama colecionar, explorar e completar sets, seja bem-vindo(a) à sua nova estante digital! 🃏✨
