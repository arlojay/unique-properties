# unique-properties npx tool
Gives a beautified JSON output for an analysis of other json files' properties

Example: `npx unique-properties -d myDirectory -p property.values.* -e testProp`

## Help output:

`--directory <dir>`: Searches in a specific directory
`--dir`, `-d`: Aliases for `--directory`

`--property <name>`: Sets the scope of the search to a sub-property of a file. Wildcards can be used for arrays and objects.
`--prop`, `-p`: Aliases for `--property`

`--output <file>`: Sets the analysis output file
`--out`, `-o`: Aliases for `--output`

`--exists <prop>`: Checks if a property exists on each object found, ignoring if it doesn't. Wildcards can be used for arrays and objects. Can be stacked. Use `!<prop>` for negative searches.
`--exist`, `-e`: Aliases for `--exists`

`--help`, `-h`: Shows the help page