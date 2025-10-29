[private]
ensure-vscode-directory:
    @mkdir -p .vscode
    cp -f ${REPO_ROOT}/source/common/.vscode/settings.json .vscode/settings.json
