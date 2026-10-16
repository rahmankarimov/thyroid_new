import orthanc
import json
import datetime
import pika
import os


RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "medical-rabbitmq")
RABBITMQ_PORT = int(os.environ.get("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.environ.get("RABBITMQ_USER", "orthanc")
RABBITMQ_PASS = os.environ.get("RABBITMQ_PASS", "orthancpass")
QUEUE_NAME = os.environ.get("QUEUE_NAME", "orthanc.stable-study")


def publish_to_rabbitmq(message: dict):
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)

    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            port=RABBITMQ_PORT,
            credentials=credentials
        )
    )

    channel = connection.channel()

    channel.queue_declare(
        queue=QUEUE_NAME,
        durable=True
    )

    channel.basic_publish(
        exchange="",
        routing_key=QUEUE_NAME,
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=2,
            content_type="application/json"
        )
    )

    connection.close()


def on_change(change_type, level, resource_id):
    if change_type == orthanc.ChangeType.STABLE_STUDY:
        now = datetime.datetime.now().isoformat()

        message = {
            "event": "STABLE_STUDY",
            "orthanc_study_id": resource_id,
            "timestamp": now
        }

        print("Publishing stable study message:")
        print(json.dumps(message, indent=2))

        publish_to_rabbitmq(message)


orthanc.RegisterOnChangeCallback(on_change)

print("Orthanc stable study RabbitMQ publisher loaded")