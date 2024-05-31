const logClickstreamMiddleware = (req, res, next) => {
    const logEntry = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString()
    };
  
    console.log(`[ClickStream] HTTP ${logEntry.method} ${logEntry.url}`);
  
    next();
};

export default logClickstreamMiddleware;