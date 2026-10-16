FROM orthancteam/orthanc:24.2.0-full

RUN apt-get update && \
    apt-get install -y --no-install-recommends gettext-base && \
    pip3 install pika && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY orthanc.json.template /tmp/orthanc.json.template
COPY docker-entrypoint.sh /usr/local/bin/thyroai-orthanc-entrypoint.sh
COPY plugins/ /etc/orthanc/plugins/

# Normalize CRLF from Windows checkouts so bash can execute the entrypoint.
RUN sed -i 's/\r$//' /usr/local/bin/thyroai-orthanc-entrypoint.sh \
    && chmod +x /usr/local/bin/thyroai-orthanc-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/thyroai-orthanc-entrypoint.sh"]
