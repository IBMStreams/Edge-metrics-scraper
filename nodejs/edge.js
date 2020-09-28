'use strict';

const express = require('express');
const axios = require('axios');
const async = require('async');
const fs = require('fs-extra');
var tar = require('tar');
const https = require('https');
var config = {username: '', password:'', url: ''};
const server = express();

function setUpWebServer() {
      // /metrics endpoint -- called by prometheus to get metrics
      server.get('/metrics', async function (req, res, next) 
      {
        try {
            var tetheredNodes = await getNodesforMetrics(config);
            var metrics = '';
            for (const tetheredNode of tetheredNodes.nodeList) {
                var nodeMetrics = await getMetricsfromNode(tetheredNode,config.url,tetheredNodes.token);
                metrics = metrics + nodeMetrics;
            }
            res.send(metrics);
        } catch(error) {
            console.log(error);
            next(error);
        }
     });
}

function startServer(){
    const port =  3001;
    server.listen(port);
    console.log('Server listening on port ' + port  + ', metrics exposed on /metrics endpoint');
}

async function getNodesforMetrics(config) {
    // get token
    let response = await axios({
        method: 'post',
            url: config.url+'/icp4d-api/v1/authorize',
            responseType: 'json',
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            data: {
                username: config.username,
                password: config.password
            },
            timeout: 10000,
            maxContentLength: Infinity
          });
    let token = response.data.token;
    // get list of tethered nodes
    response = await axios({
        method: 'get',
        url: config.url+'/zen-data/v2/connections?context=edge',
        responseType: 'json',
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token 
        },
        timeout: 10000,
        maxContentLength: Infinity
      })
      var nodeList = [];
      for (const  connection of response.data.connections) {
          nodeList.push(connection.id);
      }
      console.log(nodeList);
      return {token,nodeList};
}
async function getMetricsfromNode(id,edgeurl,token) {
    var d = new Date();
    console.log(d+" getting metrics for "+edgeurl+':'+id);
    
    let response = await axios({
        method: 'get',
        url: edgeurl+'/edge-core/v1/edge_applications/custom_metrics?target='+id,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        responseType: 'arraybuffer',
        headers: {
         'Accept' : 'application/octet-stream',
          'Authorization': 'Bearer ' + token,
          'Cache-Control': 'no-cache'
        },
        timeout: 100000,
        maxContentLength: Infinity
      });
        try {
            fs.mkdirSync('./'+id);
        } catch(error) {
            // do nothing, reusing
            console.log("Tethered node metrics directory already exists.  Reusing.")
        }    

         fs.writeFileSync('./'+id+'.tgz',response.data);
         try {
            tar.x({cwd: './'+id,file: './'+id+'.tgz', sync: true});
         }
         catch (error) {
            console.log("Error with metrics archive: "+id+'.tgz');
            throw (error);
         }
        var filepath = './'+id+'/metrics';
        var files = fs.readdirSync(filepath);
        var metrics = '';
        var defaultmetricsMap = {};
        for (const  metricfile of files) {
            if(metricfile.endsWith('default.metrics')) {
                // need to convert to prometheus format
                var d = new Date();
                var tms = d.getTime();
                var buffer = fs.readFileSync(filepath+'/'+metricfile,'utf8');
                if (buffer.length === 2) {
                    console.log("empty default metrics");
                    continue;
                }
                var defaultmetrics = JSON.parse(buffer);
                metrics = metrics+('# TYPE edge_application_cpu_percentage gauge\n# TYPE edge_application_mem_usage gauge\n# TYPE edge_application_mem_limit gauge\n');
                for(const defaultmetric of defaultmetrics) {
                    defaultmetricsMap[defaultmetric.name] = defaultmetric;
                    metrics=metrics+'edge_application_cpu_percentage{edgeappname="'+defaultmetric.name+'",edgetetherednodeid="'+id+'"}'+ defaultmetric.cpu_percent +' '+tms+'\n';
                    metrics=metrics+'edge_application_mem_usage{edgeappname="'+defaultmetric.name+'",edgetetherednodeid="'+id+'"}'+ defaultmetric.mem_usage +' '+tms+'\n';
                    metrics=metrics+'edge_application_mem_limit{edgeappname="'+defaultmetric.name+'",edgetetherednodeid="'+id+'"}'+ defaultmetric.mem_limit +' '+tms+'\n';
                }
            } else {
                var buffer = fs.readFileSync(filepath+'/'+metricfile,'utf8');
                var appName = metricfile.substr(0,metricfile.indexOf('.metrics'));
                // need to patch tags...this may go away in future
                //edge_micro_service_streams_operator_nCurrentPartitions{edgeappname="paulstreamsapp-1595258932605828",edgetetherednodeid="572921789848059907",operatorname="CalcValues"} 1 1595269668625
                buffer = buffer.replace(/operatorname=/g,'edgeappname="'+appName+'",edgetetherednodeid="'+id+'",operatorname=');
                // there is mismatch between metrics namespace for Edge and Prometheus
                // convert to underscore for now
                buffer = buffer.replace(/-/g, "_");
                buffer = buffer.replace(/\./g, "_");
                buffer = buffer.replace(/:/g, "_");
                buffer = buffer.replace(/\(/g, "_");
                buffer = buffer.replace(/\)/g, "_");
                buffer = buffer.replace(/\//g, "_");
                metrics = metrics+buffer;
            }
        }
        // clean upfiles
        fs.removeSync('./'+id);
        return metrics;
      
}

// main code starts here
if (process.argv[2] === '-h') {
     console.log('node edge <edge url> <edge username> <edge password>');
     process.exit(1);
}
if (process.argv.length != 5) {
    console.log('usage is: node edge <edge url> <edge username> <edge password>');
    process.exit(10);
}
config.url = process.argv[2];
config.username = process.argv[3];
config.password = process.argv[4];
var tetheredNodes = [];
// set up the get methods for express
setUpWebServer();
// start listening port hardcoded in method
//TO DO add port as parameter
startServer();
console.log('\nready to get metrics from edge url '+config.url);


