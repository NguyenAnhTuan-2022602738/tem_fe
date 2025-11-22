const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

type LabelPayload = {
  context: string;
  productType: string;
};

type LabelResponse = {
  _id: string;
  context: string;
  productType: string;
  text: string;
};

export const generateLabelContent = async (context: string, productType: string): Promise<string> => {
  const payload: LabelPayload = { context, productType };

  try {
    const response = await fetch(`${API_BASE_URL}/api/labels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Label API error", await response.text());
      return "Không thể tạo nội dung.";
    }

    const data = (await response.json()) as LabelResponse;
    return data.text ?? "Không thể tạo nội dung.";
  } catch (error) {
    console.error("Label API request failed", error);
    return "Lỗi khi gọi AI.";
  }
};