# Project specifciation

This is an MCP server for reading efficiently .md based documentation.

User has a folder of .md documents that are meant for ai agents to read. May have subfolders.
The folder path is given as parameter for this mcp. This mcp provides tools to find relevant
things from the .md files and read them efficiently.

Each .md file may have a metadata section like this:

```
---
Title: REST Conventions
Description: Conventions for RESTful api design, including naming conventions, versioning conventions ...
Keywords: ["REST", "RESTful", "HTTP"]
---
```

## Tools:

1. 'list_documentation_files': Lists names of all available documentation files. The file names can be used by other tools. This also shows metadata for each file. Idea is that based on this, AI agent can choose which file(s) might contain relevant information, and further explore their contents

2. 'table_of_contents(filename)': Provides a table of contents of the md file, e.g. the list of headers and their corresponding section IDs

3. 'read_sections(filenamme, section_ids[])': reads sections (parts) of a file

## Definitions:

### Section 

A header and the content underneath it, upto the next header of same or higher level.

### Section Id

A path formed from header. Example
```markdown
# REST Conventions

## Introduction
```
Here:
 - `REST Conventions` seciton's id is `rest-conventions`
 - `Introduction` section's id is `rest-conventions/introduction`
 