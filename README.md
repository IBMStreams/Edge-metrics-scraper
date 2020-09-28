# Edge Metrics
This repository contains sample code for getting metrics from BM Cloud Pak for Data Edge Analytics applications via REST API calls.  There are two components.  A metrics scraper that exposes a metrics endpoint that systems like Prometheus can scrape to pull metrics.  The second component is a dashboard sample that will display the metrics in visualization system.
## Supported Systems
* Prometheus
* Grafana

If you want additional systems, check the issues to see if your request is already there.  If not open an issue to request additional systems.
## Getting metrics to Prometheus
This describes the basic scenario where there is an instance of prometheus running, an instance of grafana running, and the edge metrics scraper running.  They are all running on localhost for purposes of this documentation.  You do not need to run them on the same host.
### Configuring, starting and testing the Edge metrics scraper
After cloning the repository you need to do the following:
* Update the hardcoded value for port.  Port is set to 3001by default.
* Determine the Cloud Pak for Data edge system url.
  * Determine credentials (username and password)
* go to the nodejs folder
  * `npm install` 
  * `node edge.js <edge url> <username> <password>`

This should result in the metrics scraper starting and listening for requests on port 3001.  
To test this try the following in your browser:
* `http://localhost:3001/metrics`

You should get a response back with the metrics in prometheus format.  
### Configuring Prometheus to pull metrics from scraper
You need to add a scraper config to your prometheus configuration.  This is a sample of what to add. The scrape interval controls how often prometheus will request metrics.  The scrape timeout determines how long prometheus will wait before givng up on the current request.  Set these to appropriate values for your use case.  The defaults are set to 1 minute and 30 seconds, these are simply arbitrary choices.  The job name is appended as a label to each metrics and can be used to query metrics.  This is defaulted to edge.  You can set to whatever is appropriate for your installation.  The target should be where you are running the metrics scraper.
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
Note: there is a mismatch in the namespace for metrics between BM Cloud Pak for Data Edge Analytics and Prometheus. The code does a mapping of invalid characters to _ during the scrape.  If you are getting invalid conversion errors this could be the problem.
The metrics scraper is an all or nothing scrape.  If there are any problems with getting metrics from any of the nodes then the scrape will return an error.
If you are getting errors check the console of the scraper to see messages.  The list of tethered edge nodes is shown and as each nodes metrics are acquired a message is produced in the log.
The raw metrics files returned from Cloud Pak for Data are not erased between scrapes.  You can find them in the nodejs folder.  The name format is `<nodeid>.tgz`.  They can also sometimes contain error messages so you check those as well.
You can check the status of the scrapes for Prometheus using the target page in Prometheus. `<prometheus url>/targets` will show the status of the scrape.  If the scrape is failing because the duration is for the context is being exceeded, raise the value of the scrape timeout in the prometheus configuration file and reload it.
### Importing dashboard into Grafana to visual Edge metrics
The folder grafana contains a sample dashboard for grafana that shows basic metrics for the applications and their ports.  To try out the dashboard sample import it into your instance of grafana.
Go to the dashboards/import page from your grafana root.  For example if running grafana at localhost:3000 use: http://localhost:3000/dashboard/import and import the json file  at /grafana/Edge Beta - Sample dashboard-1595962166443.json.