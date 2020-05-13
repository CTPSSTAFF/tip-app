How to push updates to an the TIP database to an external webserver (e.g., AWS)
===============================================================================

Note that data specific to each application is kept in a dedicated GeoServer data store. 
In the case of the TIP database, this data store is called (surprise!) "tip".

Steps:
1.	"Backup" (i.e., dump) the TIP database on the internal server to a file using pgAdmin.
2.	On the external webserver, use the GeoSever admin interface to disable the data store for the application in question. (In this case, the name of the _database_ is "tip", and the name of the _workspace_ is "tip_viewer.")
3.	Using pgAdmin, drop the application-specific database on the external server.
    *	If this operation fails with an error message indicating that the database is in use by other process(es), this may be due to:
        1.	Having forgotten to execute step (2), causing GeoServer to hold an open connection to the database.
        2.	If you ran some sample queries on the database using pgAdmin (including implicitly so doing by performing a “View/Edit Data” on one or more tables in the database) and forgot to close the query result "window(s)" in the pgAdmin interface, each such "window" would hold an open connection to the database.
4.	Using pgAdmin, create a new, empty database for the application on the external server.
    * The name of the database being created should be the same as the one dropped in step (3), e.g., "tip".
5.	Using pgAmdin, restore the database on the external server from the database dump file.
6.	The newly created and populated database on the external server will have a "public" schema and a schema specific to the application (e.g., "tip_admin")
7.	On the external webserver, use the GeoServer admin interface to enable the data store for the application in question.
