# Docker for prod site
FROM shumo/cosette-frontend

RUN apt-get install -yqq python-pip

RUN git clone --recursive https://github.com/uwdb/Cosette-Web.git

RUN pip install -r /Cosette-Web/requirements.txt

RUN cd /Cosette/dsl; git pull; cabal build

#RUN cd /Cosette-Web/backend/Cosette/dsl; cabal update; cabal sandbox init; cabal install Parsec; cabal install HUnit; cabal build

WORKDIR /Cosette-Web

EXPOSE 5000
ENV FLASK_APP main.py
CMD ["./run_server.sh"]
