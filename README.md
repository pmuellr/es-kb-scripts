es-kb-scripts - elasticsearch and kibana scripts
========================================================================

Bash scripts to make HTTP requests to Elasticsearch and Kibana servers.

You should have $ES_URL and $KB_URL set to the relevant url values,
including user/pass:

    export ES_URL=http://elastic:changeme@localhost:9200
    export KB_URL=http://elastic:changeme@localhost:5601

You will need to have `node`, `jq` and `hjson` installed.

### installing `jq`

see: https://jqlang.github.io/jq/download/

The easiest install assuming you use `brew`:

    brew install jq

### installing `hjson`

see: https://hjson.github.io/

The easiest install:

    npm install hjson -g



