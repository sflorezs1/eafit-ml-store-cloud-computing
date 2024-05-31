import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Button from "react-bootstrap/Button";

import axiosInstance from '../utils/AxiosInstance';
import { Link } from 'react-router-dom';
import { Row, Col, Image, ListGroup } from 'react-bootstrap';
import { v4 as uuid } from 'uuid';


const ModelScreen = ({ match }) => {

    const [model, setModel] = useState({})
    const [awaitingResponse, setAwaitingResponse] = useState(false)
    const [executionId, setExecutionId] = useState(null)
    const [response, setResponse] = useState(null)

    useEffect(() => {
        const fetchModel = async () => {
            console.log('Request a model...')
            const { data } = await axiosInstance.get(`/api/models/${match.params.id}`)
            setModel(data)
        }
        fetchModel()
    }, [match])

    const handleExecuteModel = async () => {
        const executionId = uuid();
        if (model.id === "1") {
            const text = document.querySelector('#test-text').value;
            await axiosInstance.post(`/api/models/${model.id}/test/${executionId}`, { text });
        } else if (model.id === "2") {
            const { data: { url } } = await axiosInstance.get(`/api/models/${model.id}/getS3PutUrl?executionId=${executionId}`);
            const file = document.querySelector('#test-image').files[0];
            await axios.put(url, file, {
                headers: {
                    'Content-Type': file.type,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }   
            });
        }
        setAwaitingResponse(true);
        setResponse(null);
        setExecutionId(executionId);
    }

    useEffect(() => {
        const fetchResponse = async () => {
            console.log('Request a response...')
            const { data } = await axiosInstance.get(`/api/models/${model.id}/test/${executionId}`);
            if (data.result) {
                setResponse(data.result);
                setAwaitingResponse(false);
                setExecutionId(null);
            }
        };

        if (awaitingResponse && executionId) {
            const int = setInterval(fetchResponse, 1000);

            return () => clearInterval(int);
        }
    }, [response, awaitingResponse, executionId]);

    return (
        <>
            <Row>
                <Col md={4}>
                    <Image src={model.image} alt={model.name} fluid />
                </Col>

                <Col md={4}>
                    <ListGroup variant='flush'>
                        <ListGroup.Item><h3>{model.name}</h3></ListGroup.Item>
                        <ListGroup.Item>Desarrollado por: {model.author}</ListGroup.Item>
                        <ListGroup.Item variant='flush'>Descripción: {model.description}</ListGroup.Item>
                        <ListGroup.Item variant='flush'>Estado: {model.status}</ListGroup.Item>
                    </ListGroup>
                </Col>
                <Col md={3}>
                    <ListGroup variant='flush'>
                        <ListGroup.Item><strong>Precio:</strong> {model.price}</ListGroup.Item>
                    </ListGroup>
                </Col>
            </Row>
            <Row>
                <Col>
                    <form>
                        {match.params.id == 1 && (
                            <textarea
                                id="test-text"
                                maxLength={512}
                                placeholder="Enter text (max 512 characters)"
                            />
                        )}
                        {match.params.id == 2 && (
                            <input
                                id="test-image"
                                type="file"
                                accept="image/png, image/jpeg"
                            />)}
                        <Button variant="outline-warning" type="button" onClick={async () => await handleExecuteModel()}>
                            Ejecutar Modelo
                        </Button>
                    </form>

                    {response && (
                        <div>
                            <h3>Resultado:</h3>
                            <p>{response}</p>
                        </div>
                    )}
                </Col>
            </Row>
        </>
    )
}

export default ModelScreen

