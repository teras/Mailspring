import _ from 'underscore';
import {
  Actions,
  Thread,
  Message,
  Folder,
  DatabaseStore,
  SearchQueryParser,
  ComponentRegistry,
  MutableQuerySubscription,
  AccountStore,
  FolderSyncProgressStore,
} from 'mailspring-exports';
import IMAPSearchQueryBackend from '../../../src/services/search/search-query-backend-imap';

class SearchQuerySubscription extends MutableQuerySubscription<Thread> {
  _searchQuery: string;
  _accountIds: string[];
  _connections = [];
  _extDisposables = [];
  _searching = false;
  _imapSearchDisposable: (() => void) | null = null;
  _pendingSearchQueries: Set<string> = new Set();

  constructor(searchQuery, accountIds) {
    super(null, { emitResultSet: true });
    this._searchQuery = searchQuery;
    this._accountIds = accountIds;

    _.defer(() => this.performSearch());
  }

  replaceRange = () => {
    // TODO
  };

  performSearch() {
    this._searching = true;
    this.performLocalSearch();
    this.performExtensionSearch();
    this.performRemoteSearch();
  }

  performLocalSearch() {
    let dbQuery = DatabaseStore.findAll<Thread>(Thread);
    if (this._accountIds.length === 1) {
      dbQuery = dbQuery.where({ accountId: this._accountIds[0] });
    }

    try {
      const parsedQuery = SearchQueryParser.parse(this._searchQuery);
      dbQuery = dbQuery.structuredSearch(parsedQuery);
    } catch (e) {
      console.info('Failed to parse local search query, falling back to generic query', e);
      dbQuery = dbQuery.search(this._searchQuery);
    }
    dbQuery = dbQuery
      .background()
      .order(Thread.attributes.lastMessageReceivedTimestamp.descending())
      .limit(1000);

    this.replaceQuery(dbQuery);
  }

  _createResultAndTrigger() {
    super._createResultAndTrigger();
    if (this._searching) {
      this._searching = false;
      Actions.searchCompleted();
    }
  }

  _addThreadIdsToSearch(ids = []) {
    const currentResults = this._set && this._set.ids().length > 0;
    let searchIds = ids;
    if (currentResults) {
      const currentResultIds = this._set.ids();
      searchIds = _.uniq(currentResultIds.concat(ids));
    }
    const dbQuery = DatabaseStore.findAll<Thread>(Thread)
      .where({ id: searchIds })
      .order(Thread.attributes.lastMessageReceivedTimestamp.descending());
    this.replaceQuery(dbQuery);
  }

  performRemoteSearch() {
    // Perform IMAP search on the server
    let parsedQuery;
    try {
      parsedQuery = SearchQueryParser.parse(this._searchQuery);
    } catch (e) {
      console.info('Failed to parse search query for IMAP search', e);
      return;
    }

    // Listen for search results
    this._imapSearchDisposable = Actions.imapSearchResultsReceived.listen(
      this._onIMAPSearchResults,
      this
    );

    // Get folders to search
    const folderNames = IMAPSearchQueryBackend.folderNamesForQuery(parsedQuery);

    // For each account, get the folders and send search requests
    for (const accountId of this._accountIds) {
      const account = AccountStore.accountForId(accountId);
      if (!account) continue;

      // Get the mailsync bridge to send messages
      const bridge = AppEnv.mailsyncBridge;
      if (!bridge || !bridge.clients()[accountId]) {
        console.warn(`No mailsync client for account ${accountId}`);
        continue;
      }

      // Get folders for this account
      DatabaseStore.findAll<Folder>(Folder)
        .where({ accountId })
        .then(folders => {
          let foldersToSearch: Folder[] = [];

          if (folderNames === 'all' || folderNames === IMAPSearchQueryBackend.ALL_FOLDERS()) {
            // Search inbox and sent folders by default
            foldersToSearch = folders.filter(
              f => f.role === 'inbox' || f.role === 'sent' || f.role === 'all'
            );
            // If no special folders found, search the first few folders
            if (foldersToSearch.length === 0) {
              foldersToSearch = folders.slice(0, 3);
            }
          } else if (Array.isArray(folderNames)) {
            // Search specific folders
            foldersToSearch = folders.filter(
              f => folderNames.includes(f.name) || folderNames.includes(f.displayName)
            );
          }

          // Send search request for each folder
          for (const folder of foldersToSearch) {
            const query = IMAPSearchQueryBackend.compile(parsedQuery, folder);

            // Skip if the query results in !ALL (folder doesn't match)
            if (query && query.includes && query.includes('!ALL')) {
              continue;
            }

            const queryId = `${accountId}-${folder.path}-${Date.now()}`;
            this._pendingSearchQueries.add(queryId);

            bridge.sendMessageToAccount(accountId, {
              type: 'imap-search',
              queryId,
              folderPath: folder.path,
              query,
            });
          }
        })
        .catch(err => {
          console.error('Failed to get folders for IMAP search', err);
        });
    }
  }

  _onIMAPSearchResults = async (results: {
    queryId: string;
    accountId: string;
    folderPath: string;
    messageIds: string[];
    error?: string;
  }) => {
    // Remove from pending
    this._pendingSearchQueries.delete(results.queryId);

    if (results.error) {
      console.warn(`IMAP search error for ${results.folderPath}:`, results.error);
      return;
    }

    if (!results.messageIds || results.messageIds.length === 0) {
      return;
    }

    // Look up thread IDs from message IDs
    const messages = await DatabaseStore.findAll<Message>(Message).where({
      id: results.messageIds,
    });

    const threadIds = _.uniq(messages.map(m => m.threadId).filter(Boolean));

    if (threadIds.length > 0) {
      this._addThreadIdsToSearch(threadIds);
    }
  };

  performExtensionSearch() {
    const searchExtensions = ComponentRegistry.findComponentsMatching({
      role: 'SearchBarResults',
    });

    this._extDisposables = searchExtensions.map(ext => {
      return ext.observeThreadIdsForQuery(this._searchQuery).subscribe((ids = []) => {
        const allIds = _.compact(_.flatten(ids));
        if (allIds.length === 0) return;
        this._addThreadIdsToSearch(allIds);
      });
    });
  }

  onLastCallbackRemoved() {
    this._connections.forEach(conn => conn.end());
    this._extDisposables.forEach(disposable => disposable.dispose());
    if (this._imapSearchDisposable) {
      this._imapSearchDisposable();
      this._imapSearchDisposable = null;
    }
  }
}

export default SearchQuerySubscription;
