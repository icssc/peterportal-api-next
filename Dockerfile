FROM postgres:latest
COPY db.sql.gz /docker-entrypoint-initdb.d/db.sql.gz
