import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	TextDocumentSyncKind,
	InitializeResult,
	Connection
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";


/**
 * Encapsulates the Sins language server logic.
 */
class SinsLanguageServer {
	/** A connection to the VS Code client. */
	private connection: Connection;

	/** A manager for open text documents. */
	private documents: TextDocuments<TextDocument>;

	/** A cached string to the workspace folder this server is operating on. */
	private workspaceFolder: string | null = null;


	constructor() {
		// Create the LSP connection.
		this.connection = createConnection(ProposedFeatures.all);

		// Create a manager for open text documents.
		this.documents = new TextDocuments(TextDocument);

		// Bind the connection event listeners.
		this.connection.onInitialize(this.onInitialize.bind(this));
		this.connection.onInitialized(this.onInitialized.bind(this));

		// Bind the document event listeners.
		this.documents.onDidOpen(this.onDidOpen.bind(this));
		this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
		this.documents.onDidClose(this.onDidClose.bind(this));

		// Make the text document manager listen on the connection for open, change, and close text document events.
		this.documents.listen(this.connection);

		// Start the server.
		this.connection.listen();
	}


	/**
	 * Called when the client starts the server.
	 * This is where server capabilities are decalred.
	 */
	private onInitialize(params: InitializeParams): InitializeResult {
		// TODO: rootUri @deprecated — in favour of workspaceFolders
		this.workspaceFolder = params.rootUri;
		this.connection.console.log(`[Server(${process.pid}) ${this.workspaceFolder}] Initialization starting.`);
		return {
			capabilities: {
				// Tell the client that this server supports code completion.
				completionProvider: {
					resolveProvider: true
				},
				// Tell the client how to sync text documents (Full vs Incremental).
				textDocumentSync: TextDocumentSyncKind.Incremental

				// textDocumentSync: {
				// 	openClose: true,
				// 	change: TextDocumentSyncKind.None
				// }
			}
		};
	}


	/**
	 * Called after the handshake is complete.
	 */
	private onInitialized(): void {
		this.connection.console.log("Server initialized.");
	}


	/**
	 * Called when a document is opened.
	 */
	private onDidOpen(event: { document: TextDocument }): void {
		this.connection.console.log(`[Server(${process.pid}) ${this.workspaceFolder}] Document opened: ${event.document.uri}`);
	}


	/**
	 * Called when a document content changes.
	 * This is usually where validation logic triggers.
	 */
	private onDidChangeContent(change: { document: TextDocument }): void {
		this.validateTextDocument(change.document);
	}


	/**
	 * Called when a document is closed.
	 */
	private onDidClose(event: { document: TextDocument }): void {
		// Clear diagnostics for closed files if necessary with empty array.
		// TODO: This is over optimistic.
		this.connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
	}


	/**
	 * Core logic for validating a document.
	 */
	private async validateTextDocument(textDocument: TextDocument): Promise<void> {
		const text = textDocument.getText();

		// TODO: Just logging the length for now.
		this.connection.console.log(`Validating ${textDocument.uri} (${text.length} characters in length.)`);

		// TODO: Implement Sins JSON validation.
	}


}


// Start the language server instance.
//--------------------------------------------------
const server = new SinsLanguageServer();
