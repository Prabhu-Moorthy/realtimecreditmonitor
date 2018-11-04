Info
----
DB2 is rinning on Nita's Bliemix with TCS ID

DB2 credentials
---------------
​{
  "port": 50000,
  "db": "BLUDB",
  "username": "bluadmin",
  "ssljdbcurl": "jdbc:db2://dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net:50001/BLUDB:sslConnection=true;",
  "host": "dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net",
  "https_url": "https://dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net:8443",
  "dsn": "DATABASE=BLUDB;HOSTNAME=dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net;PORT=50000;PROTOCOL=TCPIP;UID=bluadmin;PWD=Yjg1ZThkNjA5YThh;",
  "hostname": "dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net",
  "jdbcurl": "jdbc:db2://dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net:50000/BLUDB",
  "ssldsn": "DATABASE=BLUDB;HOSTNAME=dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net;PORT=50001;PROTOCOL=TCPIP;UID=bluadmin;PWD=Yjg1ZThkNjA5YThh;Security=SSL;",
  "uri": "db2://bluadmin:Yjg1ZThkNjA5YThh@dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net:50000/BLUDB",
  "password": "Yjg1ZThkNjA5YThh"
}

Queries
-------
Dashboard Page
SELECT CM.CM_CP_NAME,CM.CM_ULTIMATE_PARENT_NAME,CDC.CDC_LEGAL_ENTITYTYPE,CDC.CDC_MTM_NET,CDC.CDC_CVA,AD.AD_SCORE,AD.AD_SCORE_UPDATETIME,CM.CM_CURRENT_RATING 
  FROM COUNTERPARTY_MASTER CM, DETAILS_FROM_CLIENT CDC,ANALYTICAL_DETAILS AD
 WHERE CM.CM_CP_ID IN (SELECT TT_COUNTERPARTY_ID
						FROM TRACKING_TABLE
					   WHERE TT_CLIENT_ID = 'CLID1'
						 AND TT_TRACKING_STATUS = 'Y')
   AND CDC.CDC_CLIENT_ID = 'Dummy Client 1'
   AND AD.AD_COUNTERPARTY_ID IN (SELECT TT_COUNTERPARTY_ID
								  FROM TRACKING_TABLE
								 WHERE TT_CLIENT_ID = 'CLID1'
								   AND TT_TRACKING_STATUS = 'Y')
