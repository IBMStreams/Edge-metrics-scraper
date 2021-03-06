# Edge Metrics
This repository contains sample code for getting metrics from IBM Cloud Pak for Data Edge Analytics applications via REST API calls.  
There are two components:
 1.  A metrics scraper that exposes a metrics endpoint that systems like Prometheus can scrape to pull metrics. 
 2.  A sample dashboard for Grafana to visualize the metrics from the metrics scraper.

# Supported Systems
* Prometheus
* Grafana

If you want additional systems, check the issues to see if your request is already there.  If not,  open an issue to request additional systems.

## Getting metrics to Prometheus
This describes the basic scenario where there is an instance of Prometheus running, an instance of Grafana running, and the edge metrics scraper running.  They are all running on `localhost` for purposes of this documentation.  You do not need to run them on the same host.

### Configuring, starting and testing the Edge metrics scraper
After cloning the repository you need to do the following:
* Update the hardcoded value for `port`. The port is set to `3001` by default.
* Determine the Cloud Pak for Data edge system url.
  * Determine credentials (username and password)
* go to the nodejs folder
  * `npm install` 
  * `node edge.js <edge url> <username> <password>`

This should result in the metrics scraper starting and listening for requests on port 3001.  
To test this try the following in your browser:
* `http://localhost:3001/metrics`

You should get a response back with the metrics in Prometheus format.  
### Configuring Prometheus to pull metrics from scraper
You need to add a scraper config to your Prometheus configuration. 

This is a sample of what to add. 
~~~
# Sample for Edge Beta.
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  - job_name: 'edge'
    scrape_interval: 60s
    scrape_timeout: 30s
    static_configs:
    - targets: ['localhost:3001']
~~~


The following is a description of the parameters in the above configuration. Set these to appropriate values for your use case.  
- The scrape interval controls how often Prometheus will request metrics. Default is 1 minute.
-  The scrape timeout determines how long Prometheus will wait before givng up on the current request. Default is 20 seconds.
-  `job_name` is appended as a label to each metrics and can be used to query metrics.  This is defaulted to `edge`.  You can set to whatever is appropriate for your installation. 
- The `target` should be the URL and port of the metrics scraper.


### Metrics
The following are the metrics collected for each Edge application running:
* edge_application_cpu_percentage gauge
* edge_application_memory_precentage gauge
* edge_micro_service_streams_operator_nCurrentPartitions gauge  
* edge_micro_service_streams_operator_ip_tuplesprocessed counter
* edge_micro_service_streams_operator_ip_tuplesdropped counter
* edge_micro_service_streams_operator_ip_tuplesqueued gauge
* edge_micro_service_streams_operator_ip_windowpunctsprocessed counter
* edge_micro_service_streams_operator_ip_finalpunctsprocessed counter
* edge_micro_service_streams_operator_ip_windowpunctsqueued gauge
* edge_micro_service_streams_operator_ip_finalpunctsqueued gauge
* edge_micro_service_streams_operator_ip_queuesize gauge
* edge_micro_service_streams_operator_ip_maxitemsqueued counter
* edge_micro_service_streams_operator_ip_recentmaxitemsqueued gauge
* edge_micro_service_streams_operator_ip_recentmaxitemsqueuedinterval untyped
* edge_micro_service_streams_operator_ip_enqueuewaits counter
* edge_micro_service_streams_operator_op_tuples counter
* edge_micro_service_streams_operator_op_windowspuncts counter
* edge_micro_service_streams_operator_op_finalpuncts counter
* edge_micro_service_streams_operator_relativecost gauge

 
### Troubleshooting metrics scraper
Note: There is a mismatch in the namespace for metrics between IBM Cloud Pak for Data Edge Analytics and Prometheus. 
- The code does a mapping of invalid characters to `_` during the scrape.  If you are getting invalid conversion errors this could be the problem.
- The metrics scraper is an all or nothing scrape.  If there are any problems with getting metrics from any of the nodes then the scrape will return an error.
- If you are getting errors check the console of the scraper to see messages.  The list of tethered edge nodes is shown and as each node's metrics are acquired, a message is produced in the log.
- The raw metrics files returned from Cloud Pak for Data are not erased between scrapes.  You can find them in the nodejs folder.  The name format is `<nodeid>.tgz`.  They can also sometimes contain error messages so you check those as well.
- You can check the status of the scrapes for Prometheus using the target page in Prometheus. `<Prometheus url>/targets` will show the status of the scrape.  If the scrape is failing because the duration is for the context is being exceeded, raise the value of the scrape timeout in the Prometheus configuration file and reload it.

### Importing dashboard into Grafana to visualize Edge metrics
The folder `grafana` contains a sample dashboard for Grafana that shows basic metrics for the applications and their ports.  

To try out the dashboard sample, import it into your instance of Grafana.
Go to the dashboards/import page from your Grafana root.  For example if running Grafana at localhost:3000 use: http://localhost:3000/dashboard/import and import the json file  at /Grafana/Edge Beta - Sample dashboard-1595962166443.json.
