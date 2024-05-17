#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { basename } from 'node:path' 

const args = parseArgs({
  allowPositionals: true,
  options: {
    version:  { short: 'v', type: 'string', default: '8.15.0-SNAPSHOT' },
    docker:   { short: 'd', type: 'string' },
  },
})

if (args.positionals.length !== 1) help()

function help() {
  exit1(`
usage: ${basename(process.argv[1])} [options] <deployment-name>

creates a deployment template for a new ESS deployment

options: 
  -v --version  stack version to use ("8.15.0-SNAPSHOT")
  -d --docker   special docker image to use for Kibana
`.trim())
}

function exit1(msg) {
  console.error(msg)
  process.exit(1)
}

const [ name ] = args.positionals
const { version, docker } = args.values

if (!name) {
  console.error('the deployment name must be specified as a parameter')
  process.exit(1)
}

const opts = { 
  name,
  version: `${version}`, 
  docker:  `${docker}`, 
 }

const template = getBaseTemplate(opts)
console.log(JSON.stringify(template, null, 2))

/** @type { (opts: { name: string, version: string, docker: string|undefined, claimer: string, workers: number, interval: number }) => any } */
function getBaseTemplate(opts) {
  return {
    name,
    resources: {
      integrations_server: [],
      elasticsearch: [
        {
          region: 'aws-eu-west-1',
          settings: { dedicated_masters_threshold: 6 },
          plan: {
            cluster_topology: [
              {
                zone_count: 3,
                elasticsearch: { node_attributes: { data: 'hot'} },
                instance_configuration_id: 'aws.es.datahot.i3',
                node_roles: ['master','ingest','transform','data_hot','remote_cluster_client','data_content'],
                id: 'hot_content',
                size: { resource: 'memory', value: 8192 },
              },
              {
                zone_count: 2,
                elasticsearch: { node_attributes: { data: 'warm' } },
                instance_configuration_id: 'aws.es.datawarm.d3',
                node_roles: ['data_warm', 'remote_cluster_client'],
                id: 'warm',
                size: { resource: 'memory', value: 0 },
              },
              {
                zone_count: 1,
                elasticsearch: { node_attributes: { data: 'cold' }},
                instance_configuration_id: 'aws.es.datacold.d3',
                node_roles: ['data_cold', 'remote_cluster_client'],
                id: 'cold',
                size: { resource: 'memory', value: 0 },
              },
              {
                zone_count: 1,
                elasticsearch: { node_attributes: { data: 'frozen' } },
                instance_configuration_id: 'aws.es.datafrozen.i3en',
                node_roles: ['data_frozen'],
                id: 'frozen',
                size: { resource: 'memory', value: 0 },
              },
              {
                zone_count: 3,
                instance_configuration_id: 'aws.es.master.c5d',
                node_roles: ['master', 'remote_cluster_client'],
                id: 'master',
                size: { resource: 'memory', value: 0 },
              },
              {
                zone_count: 2,
                instance_configuration_id: 'aws.es.coordinating.m5d',
                node_roles: ['ingest', 'remote_cluster_client'],
                id: 'coordinating',
                size: { resource: 'memory', value: 0 },
              },
              {
                zone_count: 1,
                instance_configuration_id: 'aws.es.ml.c5d',
                node_roles: ['ml', 'remote_cluster_client'],
                id: 'ml',
                autoscaling_tier_override: true,
                autoscaling_min: { value: 0, resource: 'memory' },
                autoscaling_max: { value: 65536, resource: 'memory' },
              },
            ],
            elasticsearch: {
              version,
              enabled_built_in_plugins: [],
            },
            deployment_template: {
              id: 'aws-storage-optimized',
            },
          },
          ref_id: 'main-elasticsearch',
        },
      ],
      enterprise_search: [],
      kibana: [
        {
          elasticsearch_cluster_ref_id: 'main-elasticsearch',
          region: 'aws-eu-west-1',
          plan: {
            cluster_topology: [
              {
                instance_configuration_id: 'aws.kibana.c5d',
                zone_count: 3,
                size: { value: 8192, resource: 'memory' },
              },
            ],
            kibana: {
              version,
              ...(docker ? { docker_image: docker } : {}),
// this doesn't work, sadly ... only allowed after created?              
//              user_settings_override_json: {
//                "xpack.alerting.rules.minimumScheduleInterval": "1s",
//                "xpack.task_manager.max_workers": workers,
//                "xpack.task_manager.poll_interval": interval,
//                "xpack.task_manager.claim_strategy": `"${claimer}"`,
//              }
            },
          },
          ref_id: 'main-kibana',
        },
      ],
    },
    settings: { autoscaling_enabled: false },
    metadata: { system_owned: false },
  }
}
