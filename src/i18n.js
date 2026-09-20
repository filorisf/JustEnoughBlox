(() => {
  const RL = (window.RL = window.RL || {});

  const STRINGS = {
    en: {
      lists:'Lists', list:'list', listsWord:'lists', newList:'New list', listName:'List name', exampleTycoons:'e.g. Tycoons',
      cancel:'Cancel', create:'Create', import:'Import', preview:'Preview', loading:'Loading…', close:'Close', back:'Back',
      noListsYet:'No lists yet', noListsHelp:'Create one, then add games from any Roblox game page.', viewFullList:'View full list',
      game:'game', games:'games', savedGame:'saved game', savedGames:'saved games', gamesTitle:'Games',
      created:'Created', updated:'Updated', gameCreated:'Created', gameUpdated:'Updated', playing:'playing', playingNow:'playing now', playersUnavailable:'Players unavailable', visits:'visits', maxPerServer:'max/server',
      changeThumbnail:'Change thumbnail', resetThumbnail:'Reset thumbnail', share:'Share', rename:'Rename', delete:'Delete',
      removeFromList:'Remove from list', dragToReorder:'Drag to reorder', orderUpdated:'Order updated.', emptyList:'This list is empty', emptyListHelp:'Open a Roblox game and click “Add to List”.',
      renameList:'Rename list', deleteConfirm:'Delete “{name}”?', listRenamed:'List renamed.', listDeleted:'List deleted.', thumbnailReset:'Thumbnail reset.', savingThumbnail:'Saving thumbnail…', thumbnailUpdated:'Thumbnail updated.',
      chooseImage:'Choose an image file.', imageTooLarge:'Image is too large.', imageReadError:'Could not read this image.',
      shareList:'Share list', generatingShareCode:'Generating share code…', shareCodeHelp:'The code contains the list itself. No server is used.',
      characters:'characters', checksumProtected:'checksum protected', copyCode:'Copy code', shareCodeCopied:'Share code copied.',
      importList:'Import list', shareCode:'RL1 share code', sharedBy:'shared by', importListButton:'Import list', listImported:'List imported.', importedLocal:'Imported locally; Chrome Sync unavailable.',
      addToList:'Add to List', alreadyAdded:'Already added', createNewList:'+ Create new list', addedToList:'Added to list.', addedLocal:'Added locally; Chrome Sync unavailable.',
      newListName:'New list name', playLater:'Play Later', listCreated:'List created.', listCreatedLocal:'List created locally; Chrome Sync is unavailable.', listCreatedGameAdded:'List created and game added.',
      robloxUser:'Roblox user', homeMeta:'{lists} · {games}', dateSeparator:' · '
    },
    fr: {
      lists:'Listes', list:'liste', listsWord:'listes', newList:'Nouvelle liste', listName:'Nom de la liste', exampleTycoons:'ex. Tycoons',
      cancel:'Annuler', create:'Créer', import:'Importer', preview:'Aperçu', loading:'Chargement…', close:'Fermer', back:'Retour',
      noListsYet:'Aucune liste', noListsHelp:'Crée une liste puis ajoute des jeux depuis n’importe quelle page de jeu Roblox.', viewFullList:'Voir la liste',
      game:'jeu', games:'jeux', savedGame:'jeu enregistré', savedGames:'jeux enregistrés', gamesTitle:'Jeux',
      created:'Créée', updated:'Modifiée', gameCreated:'Créé', gameUpdated:'Mis à jour', playing:'joueurs actifs', playingNow:'joueurs actifs', playersUnavailable:'Joueurs indisponibles', visits:'visites', maxPerServer:'max/serveur',
      changeThumbnail:'Changer la miniature', resetThumbnail:'Réinitialiser la miniature', share:'Partager', rename:'Renommer', delete:'Supprimer',
      removeFromList:'Retirer de la liste', dragToReorder:'Faire glisser pour réorganiser', orderUpdated:'Ordre mis à jour.', emptyList:'Cette liste est vide', emptyListHelp:'Ouvre un jeu Roblox et clique sur « Ajouter à une liste ».',
      renameList:'Renommer la liste', deleteConfirm:'Supprimer « {name} » ?', listRenamed:'Liste renommée.', listDeleted:'Liste supprimée.', thumbnailReset:'Miniature réinitialisée.', savingThumbnail:'Enregistrement de la miniature…', thumbnailUpdated:'Miniature mise à jour.',
      chooseImage:'Choisis un fichier image.', imageTooLarge:'L’image est trop volumineuse.', imageReadError:'Impossible de lire cette image.',
      shareList:'Partager la liste', generatingShareCode:'Génération du code de partage…', shareCodeHelp:'Le code contient directement la liste. Aucun serveur n’est utilisé.',
      characters:'caractères', checksumProtected:'checksum protégé', copyCode:'Copier le code', shareCodeCopied:'Code de partage copié.',
      importList:'Importer une liste', shareCode:'Code de partage RL1', sharedBy:'partagée par', importListButton:'Importer la liste', listImported:'Liste importée.', importedLocal:'Importée localement ; Chrome Sync est indisponible.',
      addToList:'Ajouter à une liste', alreadyAdded:'Déjà ajouté', createNewList:'+ Créer une nouvelle liste', addedToList:'Ajouté à la liste.', addedLocal:'Ajouté localement ; Chrome Sync est indisponible.',
      newListName:'Nom de la nouvelle liste', playLater:'À jouer plus tard', listCreated:'Liste créée.', listCreatedLocal:'Liste créée localement ; Chrome Sync est indisponible.', listCreatedGameAdded:'Liste créée et jeu ajouté.',
      robloxUser:'Utilisateur Roblox', homeMeta:'{lists} · {games}', dateSeparator:' · '
    },
    es: {
      lists:'Listas', list:'lista', listsWord:'listas', newList:'Nueva lista', listName:'Nombre de la lista', exampleTycoons:'p. ej. Tycoons',
      cancel:'Cancelar', create:'Crear', import:'Importar', preview:'Vista previa', loading:'Cargando…', close:'Cerrar', back:'Atrás',
      noListsYet:'Aún no hay listas', noListsHelp:'Crea una y añade juegos desde cualquier página de Roblox.', viewFullList:'Ver lista completa',
      game:'juego', games:'juegos', savedGame:'juego guardado', savedGames:'juegos guardados', gamesTitle:'Juegos',
      created:'Creada', updated:'Actualizada', gameCreated:'Creado', gameUpdated:'Actualizado', playing:'jugando', playingNow:'jugando ahora', playersUnavailable:'Jugadores no disponibles', visits:'visitas', maxPerServer:'máx./servidor',
      changeThumbnail:'Cambiar miniatura', resetThumbnail:'Restablecer miniatura', share:'Compartir', rename:'Renombrar', delete:'Eliminar',
      removeFromList:'Quitar de la lista', dragToReorder:'Arrastra para reordenar', orderUpdated:'Orden actualizado.', emptyList:'Esta lista está vacía', emptyListHelp:'Abre un juego de Roblox y pulsa “Añadir a una lista”.',
      renameList:'Renombrar lista', deleteConfirm:'¿Eliminar “{name}”?', listRenamed:'Lista renombrada.', listDeleted:'Lista eliminada.', thumbnailReset:'Miniatura restablecida.', savingThumbnail:'Guardando miniatura…', thumbnailUpdated:'Miniatura actualizada.',
      chooseImage:'Elige un archivo de imagen.', imageTooLarge:'La imagen es demasiado grande.', imageReadError:'No se pudo leer la imagen.',
      shareList:'Compartir lista', generatingShareCode:'Generando código…', shareCodeHelp:'El código contiene la lista. No se usa ningún servidor.',
      characters:'caracteres', checksumProtected:'checksum protegido', copyCode:'Copiar código', shareCodeCopied:'Código copiado.',
      importList:'Importar lista', shareCode:'Código RL1', sharedBy:'compartida por', importListButton:'Importar lista', listImported:'Lista importada.', importedLocal:'Importada localmente; Chrome Sync no está disponible.',
      addToList:'Añadir a una lista', alreadyAdded:'Ya añadido', createNewList:'+ Crear nueva lista', addedToList:'Añadido a la lista.', addedLocal:'Añadido localmente; Chrome Sync no está disponible.',
      newListName:'Nombre de la nueva lista', playLater:'Jugar más tarde', listCreated:'Lista creada.', listCreatedLocal:'Lista creada localmente; Chrome Sync no está disponible.', listCreatedGameAdded:'Lista creada y juego añadido.',
      robloxUser:'Usuario de Roblox', homeMeta:'{lists} · {games}', dateSeparator:' · '
    },
    de: {
      lists:'Listen', list:'Liste', listsWord:'Listen', newList:'Neue Liste', listName:'Listenname', exampleTycoons:'z. B. Tycoons',
      cancel:'Abbrechen', create:'Erstellen', import:'Importieren', preview:'Vorschau', loading:'Lädt…', close:'Schließen', back:'Zurück',
      noListsYet:'Noch keine Listen', noListsHelp:'Erstelle eine Liste und füge Spiele von Roblox-Spielseiten hinzu.', viewFullList:'Liste ansehen',
      game:'Spiel', games:'Spiele', savedGame:'gespeichertes Spiel', savedGames:'gespeicherte Spiele', gamesTitle:'Spiele',
      created:'Erstellt', updated:'Aktualisiert', gameCreated:'Erstellt', gameUpdated:'Aktualisiert', playing:'aktiv', playingNow:'jetzt aktiv', playersUnavailable:'Spieler nicht verfügbar', visits:'Besuche', maxPerServer:'max./Server',
      changeThumbnail:'Vorschaubild ändern', resetThumbnail:'Vorschaubild zurücksetzen', share:'Teilen', rename:'Umbenennen', delete:'Löschen',
      removeFromList:'Aus Liste entfernen', dragToReorder:'Zum Sortieren ziehen', orderUpdated:'Reihenfolge aktualisiert.', emptyList:'Diese Liste ist leer', emptyListHelp:'Öffne ein Roblox-Spiel und klicke auf „Zur Liste hinzufügen“.',
      renameList:'Liste umbenennen', deleteConfirm:'„{name}“ löschen?', listRenamed:'Liste umbenannt.', listDeleted:'Liste gelöscht.', thumbnailReset:'Vorschaubild zurückgesetzt.', savingThumbnail:'Vorschaubild wird gespeichert…', thumbnailUpdated:'Vorschaubild aktualisiert.',
      chooseImage:'Wähle eine Bilddatei.', imageTooLarge:'Das Bild ist zu groß.', imageReadError:'Bild konnte nicht gelesen werden.',
      shareList:'Liste teilen', generatingShareCode:'Freigabecode wird erstellt…', shareCodeHelp:'Der Code enthält die Liste selbst. Kein Server wird verwendet.',
      characters:'Zeichen', checksumProtected:'Prüfsumme geschützt', copyCode:'Code kopieren', shareCodeCopied:'Freigabecode kopiert.',
      importList:'Liste importieren', shareCode:'RL1-Freigabecode', sharedBy:'geteilt von', importListButton:'Liste importieren', listImported:'Liste importiert.', importedLocal:'Lokal importiert; Chrome Sync ist nicht verfügbar.',
      addToList:'Zur Liste hinzufügen', alreadyAdded:'Bereits hinzugefügt', createNewList:'+ Neue Liste erstellen', addedToList:'Zur Liste hinzugefügt.', addedLocal:'Lokal hinzugefügt; Chrome Sync ist nicht verfügbar.',
      newListName:'Name der neuen Liste', playLater:'Später spielen', listCreated:'Liste erstellt.', listCreatedLocal:'Liste lokal erstellt; Chrome Sync ist nicht verfügbar.', listCreatedGameAdded:'Liste erstellt und Spiel hinzugefügt.',
      robloxUser:'Roblox-Nutzer', homeMeta:'{lists} · {games}', dateSeparator:' · '
    },
    pt: {
      lists:'Listas', list:'lista', listsWord:'listas', newList:'Nova lista', listName:'Nome da lista', exampleTycoons:'ex.: Tycoons',
      cancel:'Cancelar', create:'Criar', import:'Importar', preview:'Prévia', loading:'Carregando…', close:'Fechar', back:'Voltar',
      noListsYet:'Nenhuma lista ainda', noListsHelp:'Crie uma lista e adicione jogos a partir de qualquer página do Roblox.', viewFullList:'Ver lista completa',
      game:'jogo', games:'jogos', savedGame:'jogo salvo', savedGames:'jogos salvos', gamesTitle:'Jogos',
      created:'Criada', updated:'Atualizada', gameCreated:'Criado', gameUpdated:'Atualizado', playing:'jogando', playingNow:'jogando agora', playersUnavailable:'Jogadores indisponíveis', visits:'visitas', maxPerServer:'máx./servidor',
      changeThumbnail:'Alterar miniatura', resetThumbnail:'Redefinir miniatura', share:'Compartilhar', rename:'Renomear', delete:'Excluir',
      removeFromList:'Remover da lista', dragToReorder:'Arraste para reordenar', orderUpdated:'Ordem atualizada.', emptyList:'Esta lista está vazia', emptyListHelp:'Abra um jogo do Roblox e clique em “Adicionar à lista”.',
      renameList:'Renomear lista', deleteConfirm:'Excluir “{name}”?', listRenamed:'Lista renomeada.', listDeleted:'Lista excluída.', thumbnailReset:'Miniatura redefinida.', savingThumbnail:'Salvando miniatura…', thumbnailUpdated:'Miniatura atualizada.',
      chooseImage:'Escolha um arquivo de imagem.', imageTooLarge:'A imagem é muito grande.', imageReadError:'Não foi possível ler a imagem.',
      shareList:'Compartilhar lista', generatingShareCode:'Gerando código…', shareCodeHelp:'O código contém a própria lista. Nenhum servidor é usado.',
      characters:'caracteres', checksumProtected:'checksum protegido', copyCode:'Copiar código', shareCodeCopied:'Código copiado.',
      importList:'Importar lista', shareCode:'Código RL1', sharedBy:'compartilhada por', importListButton:'Importar lista', listImported:'Lista importada.', importedLocal:'Importada localmente; Chrome Sync indisponível.',
      addToList:'Adicionar à lista', alreadyAdded:'Já adicionado', createNewList:'+ Criar nova lista', addedToList:'Adicionado à lista.', addedLocal:'Adicionado localmente; Chrome Sync indisponível.',
      newListName:'Nome da nova lista', playLater:'Jogar depois', listCreated:'Lista criada.', listCreatedLocal:'Lista criada localmente; Chrome Sync indisponível.', listCreatedGameAdded:'Lista criada e jogo adicionado.',
      robloxUser:'Usuário do Roblox', homeMeta:'{lists} · {games}', dateSeparator:' · '
    }
  };


  Object.assign(STRINGS.en, {
    recommendations:'Recommended for this List',
    recommendationsHelp:'Based on the games already in this List.',
    findRecommendations:'Find games',
    refreshRecommendations:'Refresh',
    recommendationsLoading:'Finding similar games…',
    recommendationsEmpty:'No strong recommendations found yet.',
    recommendationsNeedGame:'Add at least one game to get recommendations.',
    recommendationAdded:'Added',
    recommendationAdd:'+ Add',
    recommendationSimilar:'Similar: {terms}',
    recommendationSameGenre:'Same genre',
    recommendationSameCreator:'Same creator',
    recommendationSuggested:'Suggested from this List',
    recommendationError:'Could not load recommendations.',
    friendPlayingInList:'{count} friend is playing a game in this List', friendsPlayingInList:'{count} friends are playing games in this List'
  });
  Object.assign(STRINGS.fr, {
    recommendations:'Recommandés pour cette liste',
    recommendationsHelp:'Basé sur les jeux déjà présents dans cette liste.',
    findRecommendations:'Trouver des jeux',
    refreshRecommendations:'Actualiser',
    recommendationsLoading:'Recherche de jeux similaires…',
    recommendationsEmpty:'Aucune recommandation suffisamment pertinente pour le moment.',
    recommendationsNeedGame:'Ajoute au moins un jeu pour obtenir des recommandations.',
    recommendationAdded:'Ajouté',
    recommendationAdd:'+ Ajouter',
    recommendationSimilar:'Similaire : {terms}',
    recommendationSameGenre:'Même genre',
    recommendationSameCreator:'Même créateur',
    recommendationSuggested:'Suggéré à partir de cette liste',
    recommendationError:'Impossible de charger les recommandations.',
    friendPlayingInList:'{count} ami joue à un jeu de cette liste', friendsPlayingInList:'{count} amis jouent à des jeux de cette liste'
  });
  Object.assign(STRINGS.es, {
    recommendations:'Recomendados para esta lista', recommendationsHelp:'Basado en los juegos que ya contiene esta lista.', findRecommendations:'Buscar juegos', refreshRecommendations:'Actualizar', recommendationsLoading:'Buscando juegos similares…', recommendationsEmpty:'Aún no hay recomendaciones suficientemente relevantes.', recommendationsNeedGame:'Añade al menos un juego para recibir recomendaciones.', recommendationAdded:'Añadido', recommendationAdd:'+ Añadir', recommendationSimilar:'Similar: {terms}', recommendationSameGenre:'Mismo género', recommendationSameCreator:'Mismo creador', recommendationSuggested:'Sugerido a partir de esta lista', recommendationError:'No se pudieron cargar las recomendaciones.', friendPlayingInList:'{count} amigo está jugando a un juego de esta lista', friendsPlayingInList:'{count} amigos están jugando a juegos de esta lista'
  });
  Object.assign(STRINGS.de, {
    recommendations:'Für diese Liste empfohlen', recommendationsHelp:'Basierend auf den Spielen, die bereits in dieser Liste sind.', findRecommendations:'Spiele finden', refreshRecommendations:'Aktualisieren', recommendationsLoading:'Ähnliche Spiele werden gesucht…', recommendationsEmpty:'Noch keine passenden Empfehlungen gefunden.', recommendationsNeedGame:'Füge mindestens ein Spiel hinzu, um Empfehlungen zu erhalten.', recommendationAdded:'Hinzugefügt', recommendationAdd:'+ Hinzufügen', recommendationSimilar:'Ähnlich: {terms}', recommendationSameGenre:'Gleiches Genre', recommendationSameCreator:'Gleicher Ersteller', recommendationSuggested:'Aus dieser Liste vorgeschlagen', recommendationError:'Empfehlungen konnten nicht geladen werden.', friendPlayingInList:'{count} Freund spielt ein Spiel aus dieser Liste', friendsPlayingInList:'{count} Freunde spielen Spiele aus dieser Liste'
  });
  Object.assign(STRINGS.pt, {
    recommendations:'Recomendados para esta lista', recommendationsHelp:'Com base nos jogos que já estão nesta lista.', findRecommendations:'Encontrar jogos', refreshRecommendations:'Atualizar', recommendationsLoading:'Procurando jogos semelhantes…', recommendationsEmpty:'Ainda não há recomendações relevantes.', recommendationsNeedGame:'Adicione pelo menos um jogo para receber recomendações.', recommendationAdded:'Adicionado', recommendationAdd:'+ Adicionar', recommendationSimilar:'Semelhante: {terms}', recommendationSameGenre:'Mesmo gênero', recommendationSameCreator:'Mesmo criador', recommendationSuggested:'Sugerido a partir desta lista', recommendationError:'Não foi possível carregar recomendações.', friendPlayingInList:'{count} amigo está jogando um jogo desta lista', friendsPlayingInList:'{count} amigos estão jogando jogos desta lista'
  });



  Object.assign(STRINGS.en, {
    sealOfQuality:'JEB Seal of Quality', sealChartsSubtitle:'Hand-picked Roblox games that meet the JEB quality standard.', sealViewAll:'View all', sealCollapse:'Collapse', sealRefresh:'Refresh',
    sealNotConfigured:'Seal feed not configured', sealConfigurePopup:'Click the JustEnoughBlox extension icon and add your public GitHub JSON feed.', sealNoGames:'No certified games yet', sealNoGamesHelp:'The JEB Seal feed is currently empty.',
    sealAwarded:'Awarded', sealGameplay:'Gameplay', sealPolish:'Polish', sealArtDirection:'Art direction', sealOriginality:'Originality', sealPlayerRespect:'Player respect', sealOpenGame:'Open game'
  });
  Object.assign(STRINGS.fr, {
    sealOfQuality:'JEB Seal of Quality', sealChartsSubtitle:'Une sélection éditoriale de jeux Roblox répondant au standard de qualité JEB.', sealViewAll:'Tout voir', sealCollapse:'Réduire', sealRefresh:'Actualiser',
    sealNotConfigured:'Feed du Seal non configuré', sealConfigurePopup:'Clique sur l’icône de l’extension JustEnoughBlox et ajoute ton feed JSON GitHub public.', sealNoGames:'Aucun jeu certifié pour le moment', sealNoGamesHelp:'Le feed JEB Seal est actuellement vide.',
    sealAwarded:'Attribué le', sealGameplay:'Gameplay', sealPolish:'Finition', sealArtDirection:'Direction artistique', sealOriginality:'Originalité', sealPlayerRespect:'Respect du joueur', sealOpenGame:'Ouvrir le jeu'
  });
  Object.assign(STRINGS.es, {
    sealOfQuality:'JEB Seal of Quality', sealChartsSubtitle:'Juegos de Roblox seleccionados que cumplen el estándar de calidad JEB.', sealViewAll:'Ver todo', sealCollapse:'Contraer', sealRefresh:'Actualizar',
    sealNotConfigured:'Feed del Seal no configurado', sealConfigurePopup:'Abre el icono de JustEnoughBlox y añade tu feed JSON público de GitHub.', sealNoGames:'Aún no hay juegos certificados', sealNoGamesHelp:'El feed JEB Seal está vacío.',
    sealAwarded:'Otorgado', sealGameplay:'Jugabilidad', sealPolish:'Acabado', sealArtDirection:'Dirección artística', sealOriginality:'Originalidad', sealPlayerRespect:'Respeto al jugador', sealOpenGame:'Abrir juego'
  });
  Object.assign(STRINGS.de, {
    sealOfQuality:'JEB Seal of Quality', sealChartsSubtitle:'Handverlesene Roblox-Spiele, die den JEB-Qualitätsstandard erfüllen.', sealViewAll:'Alle anzeigen', sealCollapse:'Einklappen', sealRefresh:'Aktualisieren',
    sealNotConfigured:'Seal-Feed nicht konfiguriert', sealConfigurePopup:'Öffne das JustEnoughBlox-Symbol und füge deinen öffentlichen GitHub-JSON-Feed hinzu.', sealNoGames:'Noch keine zertifizierten Spiele', sealNoGamesHelp:'Der JEB-Seal-Feed ist derzeit leer.',
    sealAwarded:'Verliehen', sealGameplay:'Gameplay', sealPolish:'Polish', sealArtDirection:'Art Direction', sealOriginality:'Originalität', sealPlayerRespect:'Spielerfreundlichkeit', sealOpenGame:'Spiel öffnen'
  });
  Object.assign(STRINGS.pt, {
    sealOfQuality:'JEB Seal of Quality', sealChartsSubtitle:'Jogos Roblox selecionados que atendem ao padrão de qualidade JEB.', sealViewAll:'Ver tudo', sealCollapse:'Recolher', sealRefresh:'Atualizar',
    sealNotConfigured:'Feed do Seal não configurado', sealConfigurePopup:'Clique no ícone do JustEnoughBlox e adicione seu feed JSON público do GitHub.', sealNoGames:'Ainda não há jogos certificados', sealNoGamesHelp:'O feed JEB Seal está vazio.',
    sealAwarded:'Concedido em', sealGameplay:'Gameplay', sealPolish:'Polimento', sealArtDirection:'Direção de arte', sealOriginality:'Originalidade', sealPlayerRespect:'Respeito ao jogador', sealOpenGame:'Abrir jogo'
  });

  function normalizeRobloxLocale(raw) {
    if (!raw) return '';
    const cleaned = String(raw).trim().replace('_', '-');
    try {
      return Intl.getCanonicalLocales(cleaned)[0] || '';
    } catch {
      return '';
    }
  }

  function localeFromPath() {
    const first = location.pathname.split('/').filter(Boolean)[0] || '';
    if (!/^[a-z]{2}(?:-[a-z0-9]{2,3})?$/i.test(first)) return '';
    return normalizeRobloxLocale(first);
  }

  function robloxLocaleTag() {
    // Roblox's own selected language is the source of truth. Never use
    // navigator.language / Chrome's language here.
    const candidates = [
      localeFromPath(),
      document.documentElement.getAttribute('lang'),
      document.querySelector('meta[http-equiv="content-language"]')?.content,
      document.querySelector('[data-language-code]')?.getAttribute('data-language-code'),
      document.querySelector('[data-locale]')?.getAttribute('data-locale'),
      document.querySelector('meta[name="locale-data"]')?.getAttribute('data-language-code'),
      document.querySelector('meta[name="locale-data"]')?.content
    ].map(normalizeRobloxLocale).filter(Boolean);

    return candidates[0] || 'en-US';
  }

  function detectLocale() {
    const raw = robloxLocaleTag().toLowerCase();
    const code = raw.match(/^[a-z]{2}/)?.[0] || 'en';
    return STRINGS[code] ? code : 'en';
  }

  function localeTag() {
    return robloxLocaleTag();
  }

  function t(key, vars = {}) {
    const lang = detectLocale();
    let text = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  }

  function date(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(localeTag(), { year:'numeric', month:'short', day:'numeric' }).format(d);
  }

  function number(value) {
    return new Intl.NumberFormat(localeTag()).format(Number(value) || 0);
  }

  function compact(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    return new Intl.NumberFormat(localeTag(), { notation:'compact', maximumFractionDigits:1 }).format(Number(value));
  }

  function word(singularKey, pluralKey, count) {
    return t(Number(count) === 1 ? singularKey : pluralKey);
  }

  RL.i18n = { t, date, number, compact, word, detectLocale, localeTag, robloxLocaleTag };
})();
