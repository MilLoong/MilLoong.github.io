<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html>
      <head>
        <title>RSS</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; text-align: center; }
          h1 { color: #333; }
          .item { margin: 30px auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px; max-width: 600px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #555; }
          .description { font-size: 18px; margin-bottom: 20px; color: #666; }
          button { padding: 10px 20px; background-color: #333; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
          button:hover { background-color: #555; }
        </style>
      </head>
      <body>
        <h1>RSS</h1>
        <div class="items">
          <xsl:for-each select="rss/channel/item">
            <div class="item">
              <div class="title"><xsl:value-of select="title"/></div>
              <div class="description"><xsl:value-of select="description" disable-output-escaping="yes"/></div>
              <button onclick="window.close();">关闭页面</button>
            </div>
          </xsl:for-each>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>