#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Build and run the Hello World MCP Server

.DESCRIPTION
    This script builds and runs the Model Context Protocol server.
    It can be run from any directory and will automatically locate the project.

.PARAMETER Development
    Run in development mode without building (uses tsx)

.PARAMETER Clean
    Clean the build directory before running

.PARAMETER Help
    Show help information

.EXAMPLE
    .\run-mcp-server.ps1
    Builds and runs the MCP server in production mode

.EXAMPLE
    .\run-mcp-server.ps1 -Development
    Runs the server in development mode without building

.EXAMPLE
    .\run-mcp-server.ps1 -Clean
    Cleans the build directory, then builds and runs the server

.NOTES
    Author: MCP Server Generator
    Version: 1.0.0
#>

param(
    [switch]$Development,
    [switch]$Clean,
    [switch]$Help
)

# Show help
if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Full
    exit 0
}

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Function to find the project root
function Find-ProjectRoot {
    $currentDir = Get-Location
    $projectRoot = $null

    # Search for package.json in current directory or parent directories
    $searchDir = $currentDir.Path
    while ($searchDir -ne $null -and $searchDir -ne "") {
        $packageJsonPath = Join-Path $searchDir "package.json"
        if (Test-Path $packageJsonPath) {
            $projectRoot = $searchDir
            break
        }
        $searchDir = Split-Path $searchDir -Parent
    }

    if ($projectRoot -eq $null) {
        Write-ColorOutput "Error: Could not find package.json. Please run this script from within the project directory or a subdirectory." "Red"
        exit 1
    }

    return $projectRoot
}

# Main execution
try {
    Write-ColorOutput "Hello World MCP Server Launcher" "Cyan"
    Write-ColorOutput "================================" "Cyan"

    # Find project root
    $projectRoot = Find-ProjectRoot
    Write-ColorOutput "Project root: $projectRoot" "Green"

    # Change to project directory
    Set-Location $projectRoot

    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-ColorOutput "Installing dependencies..." "Yellow"
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "Error: Failed to install dependencies" "Red"
            exit 1
        }
        Write-ColorOutput "Dependencies installed successfully" "Green"
    }

    # Clean build if requested
    if ($Clean) {
        Write-ColorOutput "Cleaning build directory..." "Yellow"
        if (Test-Path "dist") {
            Remove-Item -Recurse -Force "dist"
        }
        Write-ColorOutput "Build directory cleaned" "Green"
    }

    # Run in development or production mode
    if ($Development) {
        Write-ColorOutput "Running in development mode..." "Yellow"
        Write-ColorOutput "Press Ctrl+C to stop the server" "Gray"
        npm run dev
    } else {
        Write-ColorOutput "Building the project..." "Yellow"
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "Error: Build failed" "Red"
            exit 1
        }
        Write-ColorOutput "Build completed successfully" "Green"

        Write-ColorOutput "Starting MCP server..." "Yellow"
        Write-ColorOutput "Press Ctrl+C to stop the server" "Gray"
        npm start
    }

} catch {
    Write-ColorOutput "Error: $($_.Exception.Message)" "Red"
    exit 1
}