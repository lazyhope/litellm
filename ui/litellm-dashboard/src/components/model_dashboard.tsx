import React, { useState, useEffect } from "react";
import {
  Card,
  Title,
  Subtitle,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableBody,
  Metric,
  Text,
  Grid,
} from "@tremor/react";
import { TabPanel, TabPanels, TabGroup, TabList, Tab, TextInput } from "@tremor/react";
import { Select, SelectItem } from "@tremor/react";
import { modelInfoCall, userGetRequesedtModelsCall, modelMetricsCall, modelCreateCall, Model } from "./networking";
import { BarChart } from "@tremor/react";
import {
  Button as Button2,
  Modal,
  Form,
  Input,
  Select as Select2,
  InputNumber,
  message,
  Descriptions,
  Tooltip,
  Space,
  Row, Col,
} from "antd";
import { Badge, BadgeDelta, Button } from "@tremor/react";
import RequestAccess from "./request_model_access";
import { Typography } from "antd";

const { Title: Title2, Link } = Typography;

interface ModelDashboardProps {
  accessToken: string | null;
  token: string | null;
  userRole: string | null;
  userID: string | null;
}

const ModelDashboard: React.FC<ModelDashboardProps> = ({
  accessToken,
  token,
  userRole,
  userID,
}) => {
  const [modelData, setModelData] = useState<any>({ data: [] });
  const [modelMetrics, setModelMetrics] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [form] = Form.useForm();

  const providers = ["OpenAI", "Azure OpenAI", "Anthropic", "Gemini (Google AI Studio)", "Amazon Bedrock", "OpenAI-Compatible Endpoints (Groq, Together AI, Mistral AI, etc.)"]
  const [selectedProvider, setSelectedProvider] = useState<String>("OpenAI");

  useEffect(() => {
    if (!accessToken || !token || !userRole || !userID) {
      return;
    }
    const fetchData = async () => {
      try {
        // Replace with your actual API call for model data
        const modelDataResponse = await modelInfoCall(
          accessToken,
          userID,
          userRole
        );
        console.log("Model data response:", modelDataResponse.data);
        setModelData(modelDataResponse);

        const modelMetricsResponse = await modelMetricsCall(
          accessToken,
          userID,
          userRole
        );

        console.log("Model metrics response:", modelMetricsResponse);
        setModelMetrics(modelMetricsResponse);

        // if userRole is Admin, show the pending requests
        if (userRole === "Admin" && accessToken) {
          const user_requests = await userGetRequesedtModelsCall(accessToken);
          console.log("Pending Requests:", pendingRequests);
          setPendingRequests(user_requests.requests || []);
        }
      } catch (error) {
        console.error("There was an error fetching the model data", error);
      }
    };

    if (accessToken && token && userRole && userID) {
      fetchData();
    }
  }, [accessToken, token, userRole, userID]);

  if (!modelData) {
    return <div>Loading...</div>;
  }

  if (!accessToken || !token || !userRole || !userID) {
    return <div>Loading...</div>;
  }
  let all_models_on_proxy: any[] = [];

  // loop through model data and edit each row
  for (let i = 0; i < modelData.data.length; i++) {
    let curr_model = modelData.data[i];
    let litellm_model_name = curr_model?.litellm_params?.mode
    let model_info = curr_model?.model_info;

    let defaultProvider = "openai";
    let provider = "";
    let input_cost = "Undefined";
    let output_cost = "Undefined";
    let max_tokens = "Undefined";

    // Check if litellm_model_name is null or undefined
    if (litellm_model_name) {
      // Split litellm_model_name based on "/"
      let splitModel = litellm_model_name.split("/");

      // Get the first element in the split
      let firstElement = splitModel[0];

      // If there is only one element, default provider to openai
      provider = splitModel.length === 1 ? defaultProvider : firstElement;
    } else {
      // litellm_model_name is null or undefined, default provider to openai
      provider = defaultProvider;
    }

    if (model_info) {
      input_cost = model_info?.input_cost_per_token;
      output_cost = model_info?.output_cost_per_token;
      max_tokens = model_info?.max_tokens;
    }
    modelData.data[i].provider = provider;
    modelData.data[i].input_cost = input_cost;
    modelData.data[i].output_cost = output_cost;
    modelData.data[i].max_tokens = max_tokens;
    modelData.data[i].api_base = curr_model?.litellm_params?.api_base;

    all_models_on_proxy.push(curr_model.model_name);

    console.log(modelData.data[i]);
  }
  // when users click request access show pop up to allow them to request access

  if (userRole && userRole == "Admin Viewer") {
    const { Title, Paragraph } = Typography;
    return (
      <div>
        <Title level={1}>Access Denied</Title>
        <Paragraph>
          Ask your proxy admin for access to view all models
        </Paragraph>
      </div>
    );
  }

  const handleSubmit = async (formValues: Record<string, any>) => {
    const litellmParamsObj: Record<string, any>  = {};
    const modelInfoObj: Record<string, any>  = {};
    let modelName: string  = "";
    // Iterate through the key-value pairs in formValues
    for (const [key, value] of Object.entries(formValues)) {
      console.log(`key: ${key}, value: ${value}`)
      if (key == "model_name") {
        modelName = value
      }

      // Check if key is any of the specified API related keys
      if (key === "api_key" || key === "model" || key === "api_base" || key === "api_version" || key.startsWith("aws_")) {
        // Add key-value pair to litellm_params dictionary
        litellmParamsObj[key] = value;
      }

      // Check if key is "base_model"
      if (key === "base_model") {
        // Add key-value pair to model_info dictionary
        modelInfoObj[key] = value;
      }
    }

    console.log(`final new model: ${modelName}`)

    const new_model: Model = {  
      "model_name": modelName,
      "litellm_params": litellmParamsObj,
      "model_info": modelInfoObj
    }

    

    const response: any = await modelCreateCall(
      accessToken,
      new_model
    );

    console.log(`response for model create call: ${response["data"]}`);
  }

  const handleOk = () => {
    form
        .validateFields()
        .then((values) => {
          handleSubmit(values);
          form.resetFields();
        })
        .catch((error) => {
          console.error("Validation failed:", error);
        });
  };

  console.log(`selectedProvider: ${selectedProvider}`)

  return (
    <div style={{ width: "100%", height: "100%"}}>
      <TabGroup className="gap-2 p-8 h-[75vh] w-full mt-2">
        <TabList className="mt-2">
          <Tab>All Models</Tab>
          <Tab>Add Model</Tab>
        </TabList>
      
      <TabPanels>
          <TabPanel>
      <Grid>
        <Card>
          <Table className="mt-5">
            <TableHead>
              <TableRow>

                  <TableHeaderCell>Model Name </TableHeaderCell>

                <TableHeaderCell>
                  Provider
                </TableHeaderCell>
                {
                  userRole === "Admin" && (
                    <TableHeaderCell>
                      API Base
                    </TableHeaderCell>
                  )
                }
                <TableHeaderCell>
                  Access
                </TableHeaderCell>
                <TableHeaderCell>Input Price per token ($)</TableHeaderCell>
                <TableHeaderCell>Output Price per token ($)</TableHeaderCell>
                <TableHeaderCell>Max Tokens</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modelData.data.map((model: any) => (
                <TableRow key={model.model_name}>
                  <TableCell>
                    <Text>{model.model_name}</Text>
                  </TableCell>
                  <TableCell>{model.provider}</TableCell>
                  {
                    userRole === "Admin" && (
                      <TableCell>{model.api_base}</TableCell>
                    )
                  }

                  <TableCell>
                    {model.user_access ? (
                      <Badge color={"green"}>Yes</Badge>
                    ) : (
                      <RequestAccess
                        userModels={all_models_on_proxy}
                        accessToken={accessToken}
                        userID={userID}
                      ></RequestAccess>
                    )}
                  </TableCell>

                  <TableCell>{model.input_cost}</TableCell>
                  <TableCell>{model.output_cost}</TableCell>
                  <TableCell>{model.max_tokens}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card>
          <Title>Model Statistics (Number Requests)</Title>
              <BarChart
                data={modelMetrics}
                index="model"
                categories={["num_requests"]}
                colors={["blue"]}
                yAxisWidth={400}
                layout="vertical"
                tickGap={5}
              />
        </Card>
        <Card>
          <Title>Model Statistics (Latency)</Title>
              <BarChart
                data={modelMetrics}
                index="model"
                categories={["avg_latency_seconds"]}
                colors={["red"]}
                yAxisWidth={400}
                layout="vertical"
                tickGap={5}
              />
        </Card>
        {/* {userRole === "Admin" &&
        pendingRequests &&
        pendingRequests.length > 0 ? (
          <Card>
            <Table>
              <TableHead>
                <Title>Pending Requests</Title>
                <TableRow>
                  <TableCell>
                    <Title>User ID</Title>
                  </TableCell>
                  <TableCell>
                    <Title>Requested Models</Title>
                  </TableCell>
                  <TableCell>
                    <Title>Justification</Title>
                  </TableCell>
                  <TableCell>
                    <Title>Justification</Title>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingRequests.map((request: any) => (
                  <TableRow key={request.request_id}>
                    <TableCell>
                      <p>{request.user_id}</p>
                    </TableCell>
                    <TableCell>
                      <p>{request.models[0]}</p>
                    </TableCell>
                    <TableCell>
                      <p>{request.justification}</p>
                    </TableCell>
                    <TableCell>
                      <p>{request.user_id}</p>
                    </TableCell>
                    <Button>Approve</Button>
                    <Button variant="secondary" className="ml-2">
                      Deny
                    </Button>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : null} */}
      </Grid>
      </TabPanel>
      <TabPanel className="h-full">
      {/* <Card className="mx-auto max-w-lg flex flex-col h-[60vh] space-between">
        
      </Card> */}
      <Title2 level={2}>Add new model</Title2>
      <Card>
        <Form.Item required={true} label="Provider:" name="custom_llm_provider" tooltip="E.g. OpenAI, Azure OpenAI, Anthropic, Bedrock, etc." labelCol={{ span: 10 }} labelAlign="left">
        <Select value={selectedProvider.toString()}>
          {providers.map((provider, index) => (
              <SelectItem
                key={index}
                value={provider}
                onClick={() => {
                  setSelectedProvider(provider);
                }}
              >
                {provider}
              </SelectItem>
            ))}
        </Select>
        </Form.Item>
        <Form
          form={form}
          onFinish={handleOk}
          labelCol={{ span: 10 }}
          wrapperCol={{ span: 16 }}
          labelAlign="left"
        >
              <>
              <Form.Item required={true} label="Public Model Name" name="model_name" tooltip="Model name your users will pass in. Also used for load-balancing, LiteLLM will load balance between all models with this public name." className="mb-0">
                  <TextInput placeholder="gpt-3.5-turbo"/>
                </Form.Item>
                <Row>
                <Col span={10}></Col>
                <Col span={10}><Text className="mb-3 mt-1">Model name your users will pass in</Text></Col>
                </Row>
                <Form.Item required={true} label="LiteLLM Model Name" name="model" tooltip="Actual model name used for making litellm.completion() call." className="mb-0">
                  <TextInput placeholder="gpt-3.5-turbo-0125"/>
                </Form.Item>
                <Row>
                <Col span={10}></Col>
                <Col span={10}><Text className="mb-3 mt-1">Actual model name used for making <Link href="https://docs.litellm.ai/docs/providers" target="_blank">litellm.completion() call</Link></Text></Col>
                </Row>
                
                {
                  selectedProvider != "Amazon Bedrock" && <Form.Item
                  required={true}
                    label="API Key"
                    name="api_key"
                  >
                    <TextInput placeholder="sk-"/>
                  </Form.Item>
                }
                {
                  selectedProvider == "Azure OpenAI" && <Form.Item
                  required={true}
                  label="API Base"
                  name="api_base"
                >
                  <TextInput placeholder="https://..."/>
                </Form.Item>
                }
                {
                  selectedProvider == "Azure OpenAI" && <Form.Item
                  required={true}
                  label="API Version"
                  name="api_version"
                >
                  <TextInput placeholder="2023-07-01-preview"/>
                </Form.Item>
                }
                {
                  selectedProvider == "Azure OpenAI" && <Form.Item
                  label="Base Model"
                  name="base_model"
                >
                  <TextInput placeholder="azure/gpt-3.5-turbo"/>
                  <Text>The actual model your azure deployment uses. Used for accurate cost tracking. Select name from <Link href="https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json" target="_blank">here</Link></Text>
                </Form.Item>
                }
                {
                  selectedProvider == "Amazon Bedrock" && <Form.Item
                  required={true}
                  label="AWS Access Key ID"
                  name="aws_access_key_id"
                  tooltip="You can provide the raw key or the environment variable (e.g. `os.environ/MY_SECRET_KEY`)."
                >
                  <TextInput placeholder=""/>
                </Form.Item>
                }
                {
                  selectedProvider == "Amazon Bedrock" && <Form.Item
                  required={true}
                  label="AWS Secret Access Key"
                  name="aws_secret_access_key"
                  tooltip="You can provide the raw key or the environment variable (e.g. `os.environ/MY_SECRET_KEY`)."
                >
                  <TextInput placeholder=""/>
                </Form.Item>
                }
                {
                  selectedProvider == "Amazon Bedrock" && <Form.Item
                  required={true}
                  label="AWS Region Name"
                  name="aws_region_name"
                  tooltip="You can provide the raw key or the environment variable (e.g. `os.environ/MY_SECRET_KEY`)."
                >
                  <TextInput placeholder="us-east-1"/>
                </Form.Item>
                }
              </>
              <div style={{ textAlign: "center", marginTop: "10px" }}>
                <Button2 htmlType="submit">Add Model</Button2>
              </div>
              <Tooltip title="Get help on our github">
                <Typography.Link href="https://github.com/BerriAI/litellm/issues">Need Help?</Typography.Link>
              </Tooltip>
        </Form>
      </Card>
      </TabPanel>
      </TabPanels>
      </TabGroup>
      
    </div>
  );
};

export default ModelDashboard;
