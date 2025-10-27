# extern

The `extern` folder is intended for storing assets or content created outside this project. The original assets should be stored here to provide "source of truth" as to the attribution as well as the original, unmodified asset itself.

The intended workflow is something like this:

### Use `source` to store the original assets

- Copy the original asset to a `source/<package identifier>` folder
- Add a basic `README.md` to that folder to document the source & attribution info
- Add a shorter `attribution.meta.md` (more on this below )

### Use `expanded` to store the assets in an easy to work with format

External assets are stored in all sorts of different packaging formats and folder structures. The next step is to provide a short recipe to expand the asset(s) into an easier to work with form that's _more_ normalized.

- Add an `expand-` private recipe for the asset(s)
- Ensure this runs if and only if the asset is not already expanded!

### Use `$REPO_ROOT/assets` to store any _modified_ versions

The `assets` directory is for the "final" in-game assets. This includes assets created by contributors as well as those derived or directly from external asset packages. If external assets are being used, add a recipe to the `justfile` in `assets` to copy the asset from the `extern/expanded` directory to the appropriate fully normalized format in the `assets` directory.

- Add a recipe to `assets/justfile` to copy the external assets to assets
- Optionally include modifications (format conversion, resizing, etc.) to the recipe
- Ensure a `.meta.md` attribution file is copied for _every_ asset
- Ensure the `assets` directory contains fully normalized assets
