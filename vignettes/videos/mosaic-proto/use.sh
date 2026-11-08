#!/bin/sh
# Put one built variant in index.html so snapshot and preview can open it.
sed 's#src="../assets/#src="assets/#g' "compositions/$1.html" > index.html && echo "index.html = $1"
