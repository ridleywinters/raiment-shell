[private]
default:
    @just --list --unsorted


# Runs the demo project
demo:
    echo "TODO"

# Builds all projects
build:
    cd source/assets && just build
    cd source/cmd/fallgray && just build
    cd source/cmd/snowfall && just build

# Tests all projects
test:
    echo "TODO"

# Publishes all projects 
publish:
    echo "TODO"

# Restores the repository to a clean state
clean:
    git clean -fdx
    find . -type d -empty -delete
