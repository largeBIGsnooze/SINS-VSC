import { ASTNode } from "vscode-json-languageservice";

/**
 * Provides utility methods for working with JSON AST nodes.
 */
export class JsonAST {

	/** An index for the AST node key. */
	public static readonly NODE_KEY: number = 0;

	/** An index for the AST node value. */
	public static readonly NODE_VALUE: number = 1;

	/**
	 * Determines if the given AST node is a value node.
	 */
	public static isNodeValue(node: ASTNode | undefined): boolean {
		if (!node) {
			return false;
		}
		else if (node.parent?.type === "property" && node.parent.children?.[JsonAST.NODE_VALUE] === node) {
			// Its a value in an object property (Key: Value)
			return true;
		}
		else if (node.parent?.type === "array") {
			// Its an item in an array
			return true;
		}
		else if (!node.parent) {
			// Its the root node (rare, but valid)
			return true;
		}
		else {
			return false;
		}
	}

}
