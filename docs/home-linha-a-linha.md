# Explicacao do home.tsx (linha a linha por blocos)

Arquivo analisado: src/app/home.tsx

Este documento explica o arquivo quase linha a linha, agrupando linhas consecutivas que fazem parte da mesma ideia.

## 1) Imports e tipos

- Linhas 1-16: imports React, React Native, Expo Router, AsyncStorage, ImagePicker e BASE_URL.
- Linhas 19-21: tipos literais para modo de estante, ordenacao e raridade.
- Linhas 23-31: tipo CardItem (estrutura de uma carta).
- Linhas 33-39: tipo UserCollection (colecao de cartas por IDs).
- Linhas 41-45: tipo PhotoItem (foto individual).
- Linhas 47-51: tipo PhotoFolder (pasta de fotos com lista de fotos).
- Linhas 53-60: tipo NewCardDraft (estado do formulario de nova carta).
- Linha 62: chave de sessao salva no AsyncStorage.
- Linhas 64-68: tipo ApiUser (usuario retornado da API).
- Linhas 70-76: tipo ApiCollection (colecao normalizada no db novo).
- Linhas 78-82: tipo CollectionLink (tabela de relacao collectionCards).
- Linhas 84-88: tipo ApiFolder (pasta normalizada).
- Linhas 90-96: tipo ApiPhoto (foto normalizada).
- Linhas 98-102: pastas padrao default.
- Linhas 104-110: itens da navegacao inferior.
- Linhas 112-117: mapa de prioridade de raridade.
- Linhas 119-126: draft vazio com data default no formato AAAA-MM-DD.

## 2) Estado principal da tela

- Linha 128: inicio do componente HomeScreen.
- Linhas 129-134: params de rota, router e estado de autenticacao/carregamento remoto.
- Linha 135: fallback de nome do usuario.
- Linhas 137-141: estado de filtros (modo, ordenacao, busca, set, raridade).
- Linhas 143-144: estado de cartas e colecoes.
- Linha 145: campo de nome da nova colecao.
- Linhas 146-149: colecao selecionada (modal de detalhes).
- Linhas 150-152: busca de colecao e modal de criar colecao.
- Linhas 154-155: modal e draft de adicionar carta.
- Linhas 157-158: busca de pasta e modal de criar pasta.
- Linhas 159-161: estado de pastas de foto inicializado com default.
- Linha 162: nome da nova pasta.
- Linhas 163-166: foto pendente para nomear (fluxo adicionar foto).
- Linha 167: titulo pendente da foto.
- Linhas 168-171: preview de foto aberta.
- Linhas 172-175: alvo de renomear foto.
- Linha 176: valor digitado para renomear foto.
- Linha 177: carta selecionada (modal de detalhes da carta).

## 3) Sessao e carga inicial

- Linhas 178-207 (useEffect 1): valida sessao.
- Linhas 180-186: se nome veio por rota, salva no estado e AsyncStorage.
- Linhas 188-193: se nao veio por rota, tenta recuperar login salvo.
- Linhas 195-201: se nao houver sessao, alerta e redireciona para login.
- Linha 203: marca authChecked ao final.

- Linhas 209-315 (useEffect 2): carrega dados do usuario no modelo normalizado.
- Linhas 211-215: se nao houver authUserName, interrompe carga remota.
- Linha 218: seta remoteLoaded como false antes de buscar.
- Linhas 221-229: busca user por nome e valida resposta HTTP.
- Linhas 231-234: localiza usuario ignorando case.
- Linhas 236-245: se nao achar user, alerta e volta para login.
- Linhas 247-248: extrai userId e salva em estado.
- Linhas 250-261: faz Promise.all para cards, collections, collectionCards, folders e photos.
- Linhas 263-271: valida se todas respostas HTTP estao OK.
- Linhas 273-277: parse de JSON dos 5 recursos.
- Linhas 279-291: monta UserCollection com cardIds a partir de collectionCards.
- Linhas 293-301: monta PhotoFolder com fotos agrupadas por folderId.
- Linhas 303-305: seta cards, collections e photoFolders no estado.
- Linhas 306-310: tratamento de erro com Alert.
- Linha 312: marca remoteLoaded true no finally.

## 4) Dados derivados (useMemo)

- Linhas 317-322: uniqueSets (todos os sets unicos + "Todos").
- Linhas 324-354: filteredCards com query, set, raridade e sort.
- Linhas 356-360: cardsRecentes (ordenadas por data e limita 8).
- Linhas 362-371: sectionsBySet (agrupa cartas filtradas por set).
- Linhas 373-375: selectedCollection baseada no selectedCollectionId.
- Linhas 377-385: selectedCollectionCards resolve cardIds -> objetos CardItem.
- Linhas 387-390: cardsById (Map auxiliar para lookup rapido).
- Linhas 392-398: filteredCollections por texto.
- Linhas 400-406: filteredPhotoFolders por texto.

## 5) Utilitarios de imagem

- Linhas 408-430: pickImageFromGallery (permissao + seletor da galeria).
- Linhas 432-444: pickImageFromCamera (permissao + camera).
- Linhas 446-472: handlePickNewCardImage (Alert com opcoes Galeria/Camera).

## 6) CRUD Cartas

- Linhas 474-546: handleSaveCard.
- Linhas 475-485: normaliza campos e valida obrigatorios.
- Linhas 487-491: valida formato de data.
- Linhas 493-500: evita codigo de carta duplicado.
- Linhas 502-510: cria objeto newCard.
- Linhas 512-516: valida user logado.
- Linhas 518-536: POST /cards no json-server.
- Linhas 538-545: atualiza estado local e fecha modal.

- Linhas 1054-1081: handleDeleteCard.
- Linhas 1055-1072: remove links em collectionCards e depois deleta carta no /cards/:id.
- Linhas 1074-1080: atualiza estado local (cards, colecoes, selectedCard).

- Linhas 1083-1093: confirmDeleteCard (confirmacao antes de excluir).

## 7) CRUD Colecoes

- Linhas 548-583: handleDeleteCollection.
- Linhas 549-566: remove links da colecao em collectionCards.
- Linhas 568-577: DELETE /collections/:id.
- Linhas 579-583: atualiza estado local e limpa selecao ativa.

- Linhas 585-603: handleConfirmDeleteCollection (Alert de confirmacao).

- Linhas 605-643: handleCreateCollection.
- Linhas 606-611: valida nome nao vazio.
- Linhas 613-616: valida user logado.
- Linhas 618-623: cria objeto collection local.
- Linhas 625-639: POST /collections.
- Linhas 641-643: atualiza estado local e limpa input.

- Linhas 645-711: toggleCardInCollection.
- Linhas 646-653: encontra colecao alvo e verifica se carta ja existe.
- Linhas 655-678: se existe, remove relacao em /collectionCards.
- Linhas 679-696: se nao existe, cria relacao em /collectionCards.
- Linhas 703-711: sincroniza cardIds da colecao em memoria.

- Linhas 713-782: handlePickCollectionCover.
- Linhas 716-746: opcao Galeria com PATCH /collections/:id para coverImageUrl.
- Linhas 747-777: opcao Camera com PATCH /collections/:id para coverImageUrl.
- Linha 780: opcao Cancelar.

- Linhas 784-789: getCollectionThumbs para miniaturas da colecao.

## 8) CRUD Pastas e Fotos

- Linhas 791-827: handleDeletePhotoFolder.
- Linhas 792-808: remove fotos da pasta no backend.
- Linhas 810-818: DELETE /folders/:id.
- Linhas 820-826: atualiza estado local e limpa estados dependentes.

- Linhas 829-847: handleConfirmDeletePhotoFolder.

- Linhas 849-891: handleCreateFolder.
- Linhas 850-860: valida nome e duplicidade.
- Linhas 862-865: valida user logado.
- Linha 867: gera folderId local.
- Linhas 869-883: POST /folders.
- Linhas 885-890: atualiza estado local e limpa input.

- Linhas 893-946: pushPhotoToFolder.
- Linhas 894-897: valida user logado.
- Linhas 899-903: cria objeto newPhoto.
- Linhas 905-922: POST /photos.
- Linhas 924-944: injeta foto nova na pasta correta no estado.

- Linhas 948-956: handleAddPhotoFromGallery.
- Linhas 958-966: handleTakePhotoWithCamera.
- Linhas 968-989: handleSavePendingPhoto (valida titulo e confirma persistencia).
- Linhas 991-997: handleAddPhoto (Alert de origem da foto).

- Linhas 999-1040: handleDeletePhoto.
- Linhas 1000-1011: DELETE /photos/:id.
- Linhas 1013-1031: remove foto da pasta no estado.
- Linhas 1033-1039: fecha preview caso foto apagada estivesse aberta.

- Linhas 1042-1052: confirmDeletePhoto.

- Linhas 1095-1111: openRenamePhoto.
- Linhas 1113-1176: handleRenamePhoto.
- Linhas 1119-1123: valida texto nao vazio.
- Linhas 1125-1140: PATCH /photos/:id com novo titulo.
- Linhas 1142-1176: atualiza estado local e preview aberto.

## 9) Logout e estados de tela

- Linhas 1178-1194: handleLogout (confirmacao, limpa sessao e volta para /).
- Linhas 1196-1205: tela de loading enquanto autentica/carrega.

## 10) Render principal (JSX)

- Linhas 1208-1220: fundo com LinearGradient e elementos de glow decorativos.
- Linhas 1222-1240: header com saudacao, botao Sair e botao PERFIL.
- Linhas 1242-1252: busca principal exibida apenas quando mode != "padrao".
- Linhas 1254-1269: chips de modo (Padrao, Todas, Por set).
- Linhas 1271-1306: chips de ordenacao e raridade (apenas fora do padrao).
- Linhas 1308-1327: chips de sets (apenas no modo "set").

### 10.1 Bloco mode === "padrao"

- Linhas 1329-1361: secao Cartas recentes com card de adicionar.
- Linhas 1363-1371: mensagem de vazio para busca de colecoes.
- Linhas 1372-1383: busca de colecoes com icone de lupa.
- Linhas 1385-1454: grid de colecoes (card nova colecao + cards existentes).
- Linhas 1456-1460: secao Minhas fotos (titulo/subtitulo).
- Linhas 1461-1478: busca de pastas + botao + fora da barra.
- Linhas 1480-1566: lista de pastas de fotos.
- Linhas 1490-1495: botao excluir pasta.
- Linhas 1505-1511: botao + Foto na pasta.
- Linhas 1513-1565: preview horizontal de fotos e acoes de foto.

### 10.2 Bloco mode === "todas"

- Linhas 1571-1595: grade com todas as cartas filtradas e mensagem de vazio.

### 10.3 Bloco mode === "set"

- Linhas 1597-1638: secoes por set com scroll horizontal de cartas.

## 11) Modais

- Linhas 1642-1730: modal adicionar carta manualmente.
- Linhas 1732-1773: modal criar colecao.
- Linhas 1775-1868: modal detalhes da colecao (adicionar/remover cartas).
- Linhas 1870-1916: modal preview de foto (renomear/excluir/fechar).
- Linhas 1918-1953: modal nomear foto nova.
- Linhas 1955-1990: modal renomear foto.
- Linhas 1992-2038: modal detalhes da carta (inclui excluir).
- Linhas 2040-2080: modal criar pasta.
- Linhas 2082-2106: navegacao inferior (tabs futuras com "Em breve").

## 12) Componentes auxiliares

- Linhas 2202-2215: ModeChip.
- Linhas 2217-2230: RarityChip.
- Linhas 2232-2245: SectionTitle.
- Linhas 2247-2288: CardTile (gradiente, imagem, metadados e badge).

## 13) Stylesheet

- Linha 2290 em diante: estilos globais da tela.
- Os estilos seguem os blocos de UI descritos acima (header, busca, chips, cards, colecoes, fotos, modais e nav).
- Destaques:
  - avatarButton com width/height iguais e borderRadius metade (formato circular).
  - collectionSearchBox e folderSearchBox usam layout de input + icone.
  - folderSearchRow posiciona botao + fora da barra de busca.

## 14) Fluxo resumido de dados

1. Usuario autentica e sessao e validada no AsyncStorage.
2. App carrega userId e recursos normalizados (cards, collections, links, folders, photos).
3. Dados sao montados em estruturas de tela (collections com cardIds e folders com fotos).
4. Acoes de CRUD atualizam backend e, ao confirmar sucesso, sincronizam estado local.
5. UI reage ao estado com filtros, modais e listas.

## 15) Pontos de manutencao recomendados

- Extrair camada de servico API para reduzir tamanho de HomeScreen.
- Isolar subcomponentes (Header, CollectionsSection, PhotosSection, modais).
- Padronizar indentacao em alguns estilos para manter legibilidade.
- Considerar tratamento unificado de erro/retry para falhas de rede.
