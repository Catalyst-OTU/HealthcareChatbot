# PROJECT DESCRIPTION

## Ready to set up the project:
    git clone https://github.com/Catalyst-OTU/HealthcareChatbot.git



## Installing Packages and STARTING APPLICATION ON Windows
- Run the following command in your terminal
    - cd backend
    - cp env.example .env       ## Create Environment File
    - python3 -m venv venv
    - ./venv/Script/activate
    - pip install -r requirements.txt
    - uvicorn main:app --reload




## Installing Packages and STARTING APPLICATION ON Linux, Ubuntu
- Run the following command in your terminal
    - cd backend
    - cp env.example .env       ## Create Environment File
    - python3 -m venv venv
    - source venv/bin/activate
    - pip install -r requirements.txt
    - uvicorn main:app --reload
