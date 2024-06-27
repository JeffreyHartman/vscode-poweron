import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
  InitializeParams,
  TextDocumentPositionParams,
  Location
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// procedures will store information about procedures found in the documents
let procedures: { [key: string]: { name: string, line: number, position: number} } = {};

connection.onInitialize((params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      definitionProvider: true
    }
  };
});

connection.onDefinition((params: TextDocumentPositionParams): Location | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }
  const text = document.getText();
  const word = getWordAtPosition(text, params.position);
  if (!word) {
    return null;
  }
  const procedure = procedures[word];
  if (!procedure) {
    return null;
  }
  return {
    uri: params.textDocument.uri,
    range: {
      start: { line: procedure.line, character: 0 },
      end: { line: procedure.line, character: procedure.name.length + 10 } // Approximate end of "PROCEDURE name"
    }
  };
});

// This event is emitted when a document is opened or when it's content changes
documents.onDidChangeContent(change => {
  const text = change.document.getText();
   procedures = parseProcedures(text);
});

// parse procedures from the text
function parseProcedures(test: string) {
  const procRegex = /^PROCEDURE\s+(\w+)/gm;
  let matches: RegExpExecArray | null;
  let result: { [key: string]: { name: string, line: number, position: number} } = {};
  while ((matches = procRegex.exec(test)) !== null) {
    const name = matches[1];
    const position = matches.index;
    const line = matches.input.slice(0, position).split('\n').length - 1;
    result[name] = { name, line, position };
  }
  return result;
}

function getWordAtPosition(text: string, position: { line: number; character: number }): string | undefined {
  const lines = text.split('\n');
  const line = lines[position.line];
  const words = line.split(/\s+/);
  return words.find(word => line.indexOf(word) <= position.character && line.indexOf(word) + word.length >= position.character);
}

documents.listen(connection);
connection.listen();
